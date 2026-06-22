import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type {
  CreateOrganizationDto,
  UpdateOrganizationDto,
} from './dto/organizations.dto';

const organizationSelect = {
  id: true,
  name: true,
  slug: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.OrganizationSelect;

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateOrganizationDto) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const organization = await tx.organization.create({
          data: {
            name: dto.name.trim(),
            slug: dto.slug,
            ownerId: userId,
          },
          select: organizationSelect,
        });
        await tx.membership.create({
          data: {
            organizationId: organization.id,
            userId,
            role: 'OWNER',
            status: 'ACTIVE',
            joinedAt: new Date(),
          },
        });
        await Promise.all([
          tx.auditLog.create({
            data: {
              organizationId: organization.id,
              actorId: userId,
              action: 'ORGANIZATION_CREATED',
              entityType: 'Organization',
              entityId: organization.id,
            },
          }),
          tx.activityLog.create({
            data: {
              organizationId: organization.id,
              actorId: userId,
              action: 'organization.created',
              entityType: 'Organization',
              entityId: organization.id,
              message: `Organization ${organization.name} was created`,
            },
          }),
        ]);
        return organization;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Organization slug is already in use');
      }
      throw error;
    }
  }

  async listForUser(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        organization: { deletedAt: null },
      },
      select: {
        role: true,
        joinedAt: true,
        organization: { select: organizationSelect },
      },
      orderBy: { createdAt: 'asc' },
    });
    return memberships.map(({ organization, role, joinedAt }) => ({
      ...organization,
      role,
      joinedAt,
    }));
  }

  async get(organizationId: string) {
    const organization = await this.prisma.organization.findFirst({
      where: { id: organizationId, deletedAt: null },
      select: organizationSelect,
    });
    if (!organization) throw new NotFoundException('Organization not found');
    return organization;
  }

  async update(
    organizationId: string,
    userId: string,
    dto: UpdateOrganizationDto,
  ) {
    if (dto.name === undefined && dto.slug === undefined) {
      throw new BadRequestException(
        'At least one organization field is required',
      );
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        const organization = await tx.organization.update({
          where: { id: organizationId, deletedAt: null },
          data: { name: dto.name?.trim(), slug: dto.slug },
          select: organizationSelect,
        });
        await tx.auditLog.create({
          data: {
            organizationId,
            actorId: userId,
            action: 'ORGANIZATION_UPDATED',
            entityType: 'Organization',
            entityId: organizationId,
            metadata: { fields: Object.keys(dto) },
          },
        });
        return organization;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Organization slug is already in use');
      }
      throw error;
    }
  }

  async archive(organizationId: string, userId: string) {
    await this.prisma.$transaction([
      this.prisma.organization.update({
        where: { id: organizationId, ownerId: userId, deletedAt: null },
        data: { deletedAt: new Date() },
      }),
      this.prisma.auditLog.create({
        data: {
          organizationId,
          actorId: userId,
          action: 'ORGANIZATION_ARCHIVED',
          entityType: 'Organization',
          entityId: organizationId,
        },
      }),
      this.prisma.activityLog.create({
        data: {
          organizationId,
          actorId: userId,
          action: 'organization.archived',
          entityType: 'Organization',
          entityId: organizationId,
          message: 'Organization was archived',
        },
      }),
    ]);
  }
}
