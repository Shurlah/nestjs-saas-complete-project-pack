import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
} from 'node:crypto';
import type { Environment } from '../../config/env.validation';
import type { AccessTokenPayload, RefreshTokenPayload } from './auth.types';

@Injectable()
export class TokenService {
  private readonly outboxKey: Buffer;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<Environment, true>,
  ) {
    this.outboxKey = createHash('sha256')
      .update('outbox-account-token:')
      .update(this.configService.get('OUTBOX_ENCRYPTION_KEY', { infer: true }))
      .digest();
  }

  async createSessionTokens(
    user: { id: string; email: string },
    familyId: string = randomUUID(),
  ) {
    const sessionId = randomUUID();
    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      sid: familyId,
      type: 'access',
    };
    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      sid: sessionId,
      fid: familyId,
      type: 'refresh',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.configService.get('JWT_ACCESS_SECRET', { infer: true }),
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN', {
          infer: true,
        }),
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.configService.get('JWT_REFRESH_SECRET', { infer: true }),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', {
          infer: true,
        }),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      sessionId,
      familyId,
      refreshExpiresAt: new Date(
        Date.now() +
          parseDuration(
            this.configService.get('JWT_REFRESH_EXPIRES_IN', { infer: true }),
          ),
      ),
    };
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        token,
        {
          secret: this.configService.get('JWT_REFRESH_SECRET', { infer: true }),
        },
      );
      if (payload.type !== 'refresh' || !payload.sid || !payload.fid) {
        throw new Error('Invalid token payload');
      }
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  createOpaqueToken(): string {
    return randomBytes(32).toString('base64url');
  }

  hashOpaqueToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  encryptOutboxToken(token: string): EncryptedToken {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.outboxKey, iv);
    const ciphertext = Buffer.concat([
      cipher.update(token, 'utf8'),
      cipher.final(),
    ]);
    return {
      algorithm: 'aes-256-gcm',
      iv: iv.toString('base64url'),
      tag: cipher.getAuthTag().toString('base64url'),
      ciphertext: ciphertext.toString('base64url'),
    };
  }

  decryptOutboxToken(envelope: EncryptedToken): string {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.outboxKey,
      Buffer.from(envelope.iv, 'base64url'),
    );
    decipher.setAuthTag(Buffer.from(envelope.tag, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(envelope.ciphertext, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }
}

export interface EncryptedToken {
  [key: string]: string;
  algorithm: 'aes-256-gcm';
  iv: string;
  tag: string;
  ciphertext: string;
}

export function parseDuration(value: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(value);
  if (!match) throw new Error(`Unsupported duration: ${value}`);
  const amount = Number(match[1]);
  const units = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return amount * units[match[2] as keyof typeof units];
}
