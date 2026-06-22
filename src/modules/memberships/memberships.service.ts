import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { OrganizationRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class MembershipsService {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string) {
    return this.prisma.membership.findMany({
      where: { organizationId, status: 'ACTIVE' },
      select: {
        id: true,
        role: true,
        status: true,
        joinedAt: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            isEmailVerified: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async changeRole(
    organizationId: string,
    membershipId: string,
    actorId: string,
    role: OrganizationRole,
  ) {
    const membership = await this.findActive(organizationId, membershipId);
    if (membership.role === 'OWNER') {
      throw new BadRequestException(
        'The organization owner role cannot be changed',
      );
    }
    if (role === 'OWNER') {
      throw new BadRequestException('Ownership transfer is not supported');
    }
    if (membership.role === role) return membership;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.membership.update({
        where: { id: membership.id, organizationId },
        data: { role },
        select: {
          id: true,
          userId: true,
          organizationId: true,
          role: true,
          status: true,
          joinedAt: true,
        },
      });
      await Promise.all([
        tx.auditLog.create({
          data: {
            organizationId,
            actorId,
            action: 'MEMBER_ROLE_CHANGED',
            entityType: 'Membership',
            entityId: membership.id,
            metadata: { from: membership.role, to: role },
          },
        }),
        tx.activityLog.create({
          data: {
            organizationId,
            actorId,
            action: 'membership.role-changed',
            entityType: 'Membership',
            entityId: membership.id,
            message: `Member role changed from ${membership.role} to ${role}`,
          },
        }),
      ]);
      return updated;
    });
  }

  async remove(organizationId: string, membershipId: string, actorId: string) {
    const membership = await this.findActive(organizationId, membershipId);
    if (membership.role === 'OWNER') {
      throw new BadRequestException('The organization owner cannot be removed');
    }
    await this.prisma.$transaction([
      this.prisma.membership.update({
        where: { id: membership.id, organizationId },
        data: { status: 'REMOVED' },
      }),
      this.prisma.auditLog.create({
        data: {
          organizationId,
          actorId,
          action: 'MEMBER_REMOVED',
          entityType: 'Membership',
          entityId: membership.id,
          metadata: { removedUserId: membership.userId },
        },
      }),
      this.prisma.activityLog.create({
        data: {
          organizationId,
          actorId,
          action: 'membership.removed',
          entityType: 'Membership',
          entityId: membership.id,
          message: 'Member was removed from the organization',
        },
      }),
    ]);
  }

  private async findActive(organizationId: string, membershipId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { id: membershipId, organizationId, status: 'ACTIVE' },
    });
    if (!membership) throw new NotFoundException('Membership not found');
    return membership;
  }
}
