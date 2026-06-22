import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { OutboxEvent } from '@prisma/client';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/app.setup';
import { PrismaService } from '../src/database/prisma.service';
import {
  EncryptedToken,
  TokenService,
} from '../src/modules/auth/token.service';

const email = 'phase-3-auth@example.com';
const password = 'Initial1!Password';
const newPassword = 'Changed2!Password';
const finalPassword = 'Final3!Password';

describe('Authentication API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tokens: TokenService;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();
    prisma = app.get(PrismaService);
    tokens = app.get(TokenService);
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await app.close();
  });

  it('registers, normalizes email, hashes secrets, and protects current-user routes', async () => {
    await request(app.getHttpServer()).get('/api/v1/users/me').expect(401);

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `  ${email.toUpperCase()}  `,
        firstName: 'Phase',
        lastName: 'Three',
        password,
      })
      .expect(201);

    const body = parseAuthResponse(response.text);
    expect(body.data.user).toMatchObject({ email });
    expect(body.data.user).not.toHaveProperty('passwordHash');
    expect(body.data.accessToken).toEqual(expect.any(String));
    expect(body.data.refreshToken).toEqual(expect.any(String));

    userId = body.data.user.id;
    const stored = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    expect(stored.passwordHash).not.toBe(password);
    const session = await prisma.refreshSession.findFirstOrThrow({
      where: { userId },
    });
    expect(session.tokenHash).not.toBe(body.data.refreshToken);

    await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${body.data.accessToken}`)
      .expect(200)
      .expect(({ text }) =>
        expect(parseProfileResponse(text).data.email).toBe(email),
      );
  });

  it('returns a generic login failure for unknown email and wrong password', async () => {
    for (const credentials of [
      { email: 'missing@example.com', password },
      { email, password: 'Wrong1!Password' },
    ]) {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send(credentials)
        .expect(401)
        .expect(({ text }) =>
          expect(parseErrorResponse(text).message).toBe(
            'Invalid email or password',
          ),
        );
    }
  });

  it('rotates refresh tokens and revokes the family when an old token is reused', async () => {
    const login = await loginWith(password);
    const firstRefreshToken = login.refreshToken;
    const rotated = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: firstRefreshToken })
      .expect(201);

    const rotatedBody = parseTokenResponse(rotated.text);
    expect(rotatedBody.data.refreshToken).not.toBe(firstRefreshToken);
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: firstRefreshToken })
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: rotatedBody.data.refreshToken })
      .expect(401);
  });

  it('queues reset email, resets the password, and invalidates active sessions', async () => {
    const active = await loginWith(password);
    await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email })
      .expect(201);

    const event = await latestEvent('email.password-reset.requested');
    const resetToken = tokens.decryptOutboxToken(eventPayload(event).token);
    await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({ token: resetToken, newPassword })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${active.accessToken}`)
      .expect(401);
    await loginWith(newPassword);
  });

  it('verifies email with the queued one-time token', async () => {
    const event = await latestEvent('email.verification.requested');
    await request(app.getHttpServer())
      .post('/api/v1/auth/verify-email')
      .send({ token: tokens.decryptOutboxToken(eventPayload(event).token) })
      .expect(201);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.isEmailVerified).toBe(true);
  });

  it('updates the profile, changes password, and globally logs out', async () => {
    const session = await loginWith(newPassword);
    await request(app.getHttpServer())
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ firstName: 'Updated' })
      .expect(200)
      .expect(({ text }) =>
        expect(parseProfileResponse(text).data.firstName).toBe('Updated'),
      );
    await request(app.getHttpServer())
      .patch('/api/v1/users/me/password')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({ currentPassword: newPassword, newPassword: finalPassword })
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .expect(401);

    const finalSession = await loginWith(finalPassword);
    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${finalSession.accessToken}`)
      .send({ allDevices: true })
      .expect(201);
    await request(app.getHttpServer())
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${finalSession.accessToken}`)
      .expect(401);
  });

  async function loginWith(loginPassword: string) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: loginPassword })
      .expect(201);
    return parseTokenResponse(response.text).data;
  }

  async function latestEvent(eventType: string) {
    return prisma.outboxEvent.findFirstOrThrow({
      where: { aggregateId: userId, eventType },
      orderBy: { createdAt: 'desc' },
    });
  }

  function eventPayload(event: OutboxEvent): {
    recipient: string;
    token: EncryptedToken;
  } {
    return event.payload as unknown as {
      recipient: string;
      token: EncryptedToken;
    };
  }

  async function cleanup() {
    const users = await prisma.user.findMany({
      where: { email },
      select: { id: true },
    });
    const ids = users.map(({ id }) => id);
    if (ids.length) {
      await prisma.outboxEvent.deleteMany({
        where: { aggregateId: { in: ids } },
      });
      await prisma.auditLog.deleteMany({ where: { entityId: { in: ids } } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
  }
});

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface AuthResponse {
  data: TokenPair & { user: { id: string; email: string } };
}

function parseAuthResponse(text: string): AuthResponse {
  return JSON.parse(text) as AuthResponse;
}

function parseTokenResponse(text: string): { data: TokenPair } {
  return JSON.parse(text) as { data: TokenPair };
}

function parseProfileResponse(text: string): {
  data: { email?: string; firstName?: string };
} {
  return JSON.parse(text) as { data: { email?: string; firstName?: string } };
}

function parseErrorResponse(text: string): { message: string } {
  return JSON.parse(text) as { message: string };
}
