import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Membership } from '@prisma/client';
import { isUUID } from 'class-validator';
import type { Request } from 'express';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ProjectAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { membership: Membership }>();
    const organizationId = request.params.organizationId;
    const projectId = request.params.projectId;
    if (
      typeof organizationId !== 'string' ||
      typeof projectId !== 'string' ||
      !isUUID(organizationId) ||
      !isUUID(projectId)
    ) {
      throw new NotFoundException('Project not found');
    }
    const elevatedRoles = ['OWNER', 'ADMIN', 'PROJECT_MANAGER'];
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        organizationId,
        deletedAt: null,
        ...(elevatedRoles.includes(request.membership.role)
          ? {}
          : {
              OR: [
                { members: { some: { userId: request.membership.userId } } },
                {
                  team: {
                    members: {
                      some: { userId: request.membership.userId },
                    },
                  },
                },
              ],
            }),
      },
      select: { id: true },
    });
    if (!project) throw new NotFoundException('Project not found');
    return true;
  }
}
