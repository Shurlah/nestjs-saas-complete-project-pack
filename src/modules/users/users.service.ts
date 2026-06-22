import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../../database/prisma.service';
import type { ChangePasswordDto, UpdateProfileDto } from './dto/users.dto';

const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  status: true,
  isEmailVerified: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrent(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: userSelect,
    });
    if (!user) throw new UnauthorizedException();
    return user;
  }

  async updateCurrent(userId: string, dto: UpdateProfileDto) {
    if (dto.firstName === undefined && dto.lastName === undefined) {
      throw new BadRequestException('At least one profile field is required');
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName?.trim(),
        lastName: dto.lastName?.trim(),
      },
      select: userSelect,
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    if (!(await argon2.verify(user.passwordHash, dto.currentPassword))) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    if (await argon2.verify(user.passwordHash, dto.newPassword)) {
      throw new BadRequestException(
        'New password must differ from current password',
      );
    }
    const passwordHash = await argon2.hash(dto.newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      }),
      this.prisma.refreshSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.prisma.auditLog.create({
        data: {
          action: AuditAction.PASSWORD_CHANGED,
          actorId: userId,
          entityType: 'User',
          entityId: userId,
        },
      }),
    ]);
  }
}
