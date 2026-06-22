import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { TokenService } from '../auth/token.service';
import type { CreateInvitationDto } from './dto/invitations.dto';

const invitationSelect = {
  id: true,
  organizationId: true,
  email: true,
  role: true,
  status: true,
  invitedById: true,
  expiresAt: true,
  acceptedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.InvitationSelect;

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
  ) {}

  async create(
    organizationId: string,
    invitedById: string,
    dto: CreateInvitationDto,
  ) {
    if (dto.role === 'OWNER') {
      throw new BadRequestException('OWNER invitations are not supported');
    }
    const existingMember = await this.prisma.membership.findFirst({
      where: {
        organizationId,
        status: 'ACTIVE',
        user: { email: dto.email },
      },
      select: { id: true },
    });
    if (existingMember) {
      throw new ConflictException('This user is already an active member');
    }

    const rawToken = this.tokens.createOpaqueToken();
    return this.prisma.$transaction(async (tx) => {
      await tx.invitation.updateMany({
        where: { organizationId, email: dto.email, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });
      const invitation = await tx.invitation.create({
        data: {
          organizationId,
          invitedById,
          email: dto.email,
          role: dto.role,
          tokenHash: this.tokens.hashOpaqueToken(rawToken),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1_000),
        },
        select: invitationSelect,
      });
      await Promise.all([
        tx.auditLog.create({
          data: {
            organizationId,
            actorId: invitedById,
            action: 'MEMBER_INVITED',
            entityType: 'Invitation',
            entityId: invitation.id,
            metadata: { email: dto.email, role: dto.role },
          },
        }),
        tx.outboxEvent.create({
          data: {
            organizationId,
            topic: 'email',
            eventType: 'email.organization-invitation.requested',
            aggregateType: 'Invitation',
            aggregateId: invitation.id,
            payload: {
              recipient: dto.email,
              organizationId,
              token: this.tokens.encryptOutboxToken(rawToken),
            },
          },
        }),
      ]);
      return invitation;
    });
  }

  list(organizationId: string) {
    return this.prisma.invitation.findMany({
      where: { organizationId },
      select: invitationSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async accept(userId: string, userEmail: string, rawToken: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash: this.tokens.hashOpaqueToken(rawToken) },
      include: { organization: { select: { deletedAt: true } } },
    });
    if (!invitation || invitation.status !== 'PENDING') {
      throw new BadRequestException('Invalid invitation token');
    }
    if (invitation.expiresAt <= new Date()) {
      await this.prisma.invitation.update({
        where: {
          id: invitation.id,
          organizationId: invitation.organizationId,
        },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Invitation has expired');
    }
    if (invitation.organization.deletedAt) {
      throw new BadRequestException('Invitation is no longer valid');
    }
    if (invitation.email !== userEmail.trim().toLowerCase()) {
      throw new ForbiddenException('Invitation belongs to another account');
    }

    const existing = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: invitation.organizationId,
        },
      },
    });
    if (existing?.status === 'ACTIVE') {
      throw new ConflictException(
        'You are already a member of this organization',
      );
    }
    if (existing?.status === 'SUSPENDED') {
      throw new ForbiddenException('Your membership is suspended');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.invitation.updateMany({
          where: {
            id: invitation.id,
            organizationId: invitation.organizationId,
            status: 'PENDING',
          },
          data: { status: 'ACCEPTED', acceptedAt: new Date() },
        });
        if (claimed.count !== 1) {
          throw new ConflictException('Invitation has already been used');
        }
        const membership = existing
          ? await tx.membership.update({
              where: {
                id: existing.id,
                organizationId: invitation.organizationId,
              },
              data: {
                role: invitation.role,
                status: 'ACTIVE',
                joinedAt: new Date(),
              },
            })
          : await tx.membership.create({
              data: {
                userId,
                organizationId: invitation.organizationId,
                role: invitation.role,
                status: 'ACTIVE',
                joinedAt: new Date(),
              },
            });
        await Promise.all([
          tx.auditLog.create({
            data: {
              organizationId: invitation.organizationId,
              actorId: userId,
              action: 'INVITATION_ACCEPTED',
              entityType: 'Invitation',
              entityId: invitation.id,
            },
          }),
          tx.activityLog.create({
            data: {
              organizationId: invitation.organizationId,
              actorId: userId,
              action: 'invitation.accepted',
              entityType: 'Invitation',
              entityId: invitation.id,
              message: 'Invitation was accepted',
            },
          }),
        ]);
        return {
          organizationId: invitation.organizationId,
          membershipId: membership.id,
          role: membership.role,
        };
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'You are already a member of this organization',
        );
      }
      throw error;
    }
  }

  async cancel(organizationId: string, invitationId: string) {
    const invitation = await this.prisma.invitation.findFirst({
      where: { id: invitationId, organizationId, status: 'PENDING' },
      select: { id: true },
    });
    if (!invitation)
      throw new NotFoundException('Pending invitation not found');
    await this.prisma.invitation.update({
      where: { id: invitation.id, organizationId },
      data: { status: 'CANCELLED' },
    });
  }
}
