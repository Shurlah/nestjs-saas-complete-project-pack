import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Environment } from '../../config/env.validation';
import { PrismaService } from '../../database/prisma.service';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import type { AccessTokenPayload } from './auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService<Environment, true>,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_ACCESS_SECRET', { infer: true }),
    });
  }

  async validate(payload: AccessTokenPayload): Promise<AuthenticatedUser> {
    if (payload.type !== 'access' || !payload.sid) {
      throw new UnauthorizedException();
    }
    const user = await this.prisma.user.findFirst({
      where: {
        id: payload.sub,
        email: payload.email,
        status: 'ACTIVE',
        deletedAt: null,
        refreshSessions: {
          some: {
            familyId: payload.sid,
            revokedAt: null,
            expiresAt: { gt: new Date() },
          },
        },
      },
      select: { id: true, email: true },
    });
    if (!user) throw new UnauthorizedException();
    return { ...user, sessionId: payload.sid };
  }
}
