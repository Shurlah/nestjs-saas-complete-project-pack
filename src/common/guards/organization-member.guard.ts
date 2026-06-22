import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Membership } from '@prisma/client';
import { isUUID } from 'class-validator';
import type { Request } from 'express';
import { PrismaService } from '../../database/prisma.service';
import type { AuthenticatedUser } from '../types/authenticated-user.type';

@Injectable()
export class OrganizationMemberGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<
        Request & { user: AuthenticatedUser; membership?: Membership }
      >();
    const rawOrganizationId = request.params.organizationId;
    if (typeof rawOrganizationId !== 'string' || !isUUID(rawOrganizationId)) {
      throw new BadRequestException('A valid organizationId is required');
    }
    const organizationId = rawOrganizationId;
    const membership = await this.prisma.membership.findFirst({
      where: {
        organizationId,
        userId: request.user.id,
        status: 'ACTIVE',
        organization: { deletedAt: null },
      },
    });
    if (!membership) {
      throw new ForbiddenException(
        'You do not have access to this organization',
      );
    }
    request.membership = membership;
    return true;
  }
}
