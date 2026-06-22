import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../../database/prisma.service';
import type {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './dto/auth.dto';
import type { RequestContext } from './auth.types';
import { TokenService } from './token.service';

const publicUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  status: true,
  isEmailVerified: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
  ) {}

  async register(dto: RegisterDto, context: RequestContext) {
    const email = normalizeEmail(dto.email);
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await argon2.hash(dto.password);
    const verificationToken = this.tokens.createOpaqueToken();
    const verificationTokenHash =
      this.tokens.hashOpaqueToken(verificationToken);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            firstName: dto.firstName.trim(),
            lastName: dto.lastName.trim(),
            passwordHash,
          },
          select: publicUserSelect,
        });
        const sessionTokens = await this.tokens.createSessionTokens(user);
        const refreshTokenHash = await argon2.hash(sessionTokens.refreshToken);
        await Promise.all([
          tx.refreshSession.create({
            data: {
              ...sessionData(user.id, sessionTokens, context),
              tokenHash: refreshTokenHash,
            },
          }),
          tx.emailVerificationToken.create({
            data: {
              userId: user.id,
              tokenHash: verificationTokenHash,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1_000),
            },
          }),
          tx.auditLog.create({
            data: auditData('USER_REGISTERED', user.id, context),
          }),
          tx.outboxEvent.create({
            data: {
              topic: 'email',
              eventType: 'email.verification.requested',
              aggregateType: 'User',
              aggregateId: user.id,
              payload: {
                recipient: user.email,
                token: this.tokens.encryptOutboxToken(verificationToken),
              },
            },
          }),
        ]);
        return authResult(user, sessionTokens);
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'An account with this email already exists',
        );
      }
      throw error;
    }
  }

  async login(dto: LoginDto, context: RequestContext) {
    const user = await this.prisma.user.findUnique({
      where: { email: normalizeEmail(dto.email) },
    });
    if (
      !user ||
      user.deletedAt ||
      user.status !== 'ACTIVE' ||
      !(await argon2.verify(user.passwordHash, dto.password))
    ) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const sessionTokens = await this.tokens.createSessionTokens(user);
    const refreshTokenHash = await argon2.hash(sessionTokens.refreshToken);
    const publicUser = await this.prisma.$transaction(async (tx) => {
      await tx.refreshSession.create({
        data: {
          ...sessionData(user.id, sessionTokens, context),
          tokenHash: refreshTokenHash,
        },
      });
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
        select: publicUserSelect,
      });
      await tx.auditLog.create({
        data: auditData('USER_LOGIN', user.id, context),
      });
      return updatedUser;
    });
    return authResult(publicUser, sessionTokens);
  }

  async refresh(refreshToken: string, context: RequestContext) {
    const payload = await this.tokens.verifyRefreshToken(refreshToken);
    const session = await this.prisma.refreshSession.findUnique({
      where: { id: payload.sid },
      include: { user: true },
    });
    if (!session || session.familyId !== payload.fid) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const validHash = await argon2.verify(session.tokenHash, refreshToken);
    if (
      !validHash ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.user.status !== 'ACTIVE' ||
      session.user.deletedAt
    ) {
      await this.prisma.refreshSession.updateMany({
        where: { familyId: session.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const next = await this.tokens.createSessionTokens(
      session.user,
      session.familyId,
    );
    const tokenHash = await argon2.hash(next.refreshToken);
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.refreshSession.create({
          data: {
            ...sessionData(session.userId, next, context),
            tokenHash,
          },
        });
        await tx.refreshSession.update({
          where: { id: session.id },
          data: {
            lastUsedAt: new Date(),
            revokedAt: new Date(),
            replacedBySessionId: next.sessionId,
          },
        });
      });
    } catch {
      await this.prisma.refreshSession.updateMany({
        where: { familyId: session.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    return { accessToken: next.accessToken, refreshToken: next.refreshToken };
  }

  async logout(
    userId: string,
    familyId: string,
    allDevices: boolean,
    context: RequestContext,
  ) {
    await this.prisma.$transaction([
      this.prisma.refreshSession.updateMany({
        where: {
          userId,
          ...(allDevices ? {} : { familyId }),
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      }),
      this.prisma.auditLog.create({
        data: auditData('USER_LOGOUT', userId, context, { allDevices }),
      }),
    ]);
  }

  async forgotPassword(dto: ForgotPasswordDto, context: RequestContext) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: normalizeEmail(dto.email),
        status: 'ACTIVE',
        deletedAt: null,
      },
      select: { id: true, email: true },
    });
    if (!user) return;

    const rawToken = this.tokens.createOpaqueToken();
    await this.prisma.$transaction(async (tx) => {
      await tx.passwordResetToken.deleteMany({
        where: { userId: user.id, usedAt: null },
      });
      await tx.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: this.tokens.hashOpaqueToken(rawToken),
          expiresAt: new Date(Date.now() + 60 * 60 * 1_000),
        },
      });
      await tx.auditLog.create({
        data: auditData('PASSWORD_RESET_REQUESTED', user.id, context),
      });
      await tx.outboxEvent.create({
        data: {
          topic: 'email',
          eventType: 'email.password-reset.requested',
          aggregateType: 'User',
          aggregateId: user.id,
          payload: {
            recipient: user.email,
            token: this.tokens.encryptOutboxToken(rawToken),
          },
        },
      });
    });
  }

  async resetPassword(dto: ResetPasswordDto, context: RequestContext) {
    const token = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: this.tokens.hashOpaqueToken(dto.token) },
    });
    if (!token || token.usedAt || token.expiresAt <= new Date()) {
      throw new BadRequestException('Invalid or expired password reset token');
    }
    const passwordHash = await argon2.hash(dto.newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: token.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshSession.updateMany({
        where: { userId: token.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      this.prisma.auditLog.create({
        data: auditData('PASSWORD_RESET_COMPLETED', token.userId, context),
      }),
    ]);
  }

  async verifyEmail(dto: VerifyEmailDto, context: RequestContext) {
    const token = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash: this.tokens.hashOpaqueToken(dto.token) },
    });
    if (!token || token.usedAt || token.expiresAt <= new Date()) {
      throw new BadRequestException('Invalid or expired verification token');
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: token.userId },
        data: { isEmailVerified: true },
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: token.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.auditLog.create({
        data: auditData('EMAIL_VERIFIED', token.userId, context),
      }),
    ]);
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function sessionData(
  userId: string,
  tokens: Awaited<ReturnType<TokenService['createSessionTokens']>>,
  context: RequestContext,
) {
  return {
    id: tokens.sessionId,
    userId,
    familyId: tokens.familyId,
    tokenHash: '',
    expiresAt: tokens.refreshExpiresAt,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
  };
}

function auditData(
  action: Prisma.AuditLogCreateInput['action'],
  userId: string,
  context: RequestContext,
  metadata?: Prisma.InputJsonValue,
): Prisma.AuditLogUncheckedCreateInput {
  return {
    action,
    actorId: userId,
    entityType: 'User',
    entityId: userId,
    ipAddress: context.ipAddress,
    userAgent: context.userAgent,
    metadata,
  };
}

function authResult(
  user: Prisma.UserGetPayload<{ select: typeof publicUserSelect }>,
  tokens: Awaited<ReturnType<TokenService['createSessionTokens']>>,
) {
  return {
    user,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}
