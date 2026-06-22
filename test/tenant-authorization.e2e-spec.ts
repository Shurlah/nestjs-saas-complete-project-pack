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

const password = 'Tenant1!Password';
const emails = {
  owner: 'phase-4-owner@example.com',
  member: 'phase-4-member@example.com',
  pending: 'phase-4-pending@example.com',
} as const;

describe('Tenant root and authorization API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tokens: TokenService;
  let owner: Session;
  let member: Session;
  let organizationAId: string;
  let organizationBId: string;
  let ownerMembershipId: string;
  let memberMembershipId: string;

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

  it('creates organizations with atomic OWNER memberships', async () => {
    owner = await register(emails.owner, 'Owner');
    member = await register(emails.member, 'Member');

    const organizationA = await createOrganization(
      owner.accessToken,
      'Phase Four A',
      'phase-four-a',
    );
    const organizationB = await createOrganization(
      owner.accessToken,
      'Phase Four B',
      'phase-four-b',
    );
    organizationAId = organizationA.id;
    organizationBId = organizationB.id;

    const ownerMembership = await prisma.membership.findUniqueOrThrow({
      where: {
        userId_organizationId: {
          userId: owner.userId,
          organizationId: organizationAId,
        },
      },
    });
    ownerMembershipId = ownerMembership.id;
    expect(ownerMembership.role).toBe('OWNER');
    expect(organizationA.ownerId).toBe(owner.userId);

    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationAId}`)
      .set(bearer(member.accessToken))
      .expect(403);
  });

  it('invites the matching account using a hashed and encrypted token', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationAId}/invitations`)
      .set(bearer(owner.accessToken))
      .send({ email: emails.member.toUpperCase(), role: 'MEMBER' })
      .expect(201);

    const invitation = await prisma.invitation.findFirstOrThrow({
      where: { organizationId: organizationAId, email: emails.member },
      orderBy: { createdAt: 'desc' },
    });
    const event = await prisma.outboxEvent.findFirstOrThrow({
      where: {
        aggregateId: invitation.id,
        eventType: 'email.organization-invitation.requested',
      },
    });
    const envelope = invitationEnvelope(event);
    const rawToken = tokens.decryptOutboxToken(envelope);
    expect(invitation.tokenHash).not.toBe(rawToken);
    expect(JSON.stringify(event.payload)).not.toContain(rawToken);

    await request(app.getHttpServer())
      .post('/api/v1/invitations/accept')
      .set(bearer(member.accessToken))
      .send({ token: rawToken })
      .expect(201)
      .expect(({ text }) =>
        expect(parseData<{ role: string }>(text).data.role).toBe('MEMBER'),
      );

    const membership = await prisma.membership.findUniqueOrThrow({
      where: {
        userId_organizationId: {
          userId: member.userId,
          organizationId: organizationAId,
        },
      },
    });
    memberMembershipId = membership.id;
  });

  it('isolates organizations and applies least-privilege role checks', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationAId}`)
      .set(bearer(member.accessToken))
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationBId}`)
      .set(bearer(member.accessToken))
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationAId}`)
      .set(bearer(member.accessToken))
      .send({ name: 'Unauthorized update' })
      .expect(403);
    await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationAId}/invitations`)
      .set(bearer(member.accessToken))
      .send({ email: emails.pending, role: 'GUEST' })
      .expect(403);

    await request(app.getHttpServer())
      .patch(
        `/api/v1/organizations/${organizationBId}/members/${memberMembershipId}/role`,
      )
      .set(bearer(owner.accessToken))
      .send({ role: 'ADMIN' })
      .expect(404);
  });

  it('allows role management while protecting the owner invariant', async () => {
    await request(app.getHttpServer())
      .patch(
        `/api/v1/organizations/${organizationAId}/members/${memberMembershipId}/role`,
      )
      .set(bearer(owner.accessToken))
      .send({ role: 'ADMIN' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/api/v1/organizations/${organizationAId}`)
      .set(bearer(member.accessToken))
      .send({ name: 'Admin Updated Organization' })
      .expect(200);
    await request(app.getHttpServer())
      .patch(
        `/api/v1/organizations/${organizationAId}/members/${ownerMembershipId}/role`,
      )
      .set(bearer(member.accessToken))
      .send({ role: 'MEMBER' })
      .expect(400);
    await request(app.getHttpServer())
      .delete(
        `/api/v1/organizations/${organizationAId}/members/${ownerMembershipId}`,
      )
      .set(bearer(member.accessToken))
      .expect(400);
    await request(app.getHttpServer())
      .delete(`/api/v1/organizations/${organizationAId}`)
      .set(bearer(member.accessToken))
      .expect(403);
  });

  it('cancels pending invitations and revokes removed-member access', async () => {
    const created = await request(app.getHttpServer())
      .post(`/api/v1/organizations/${organizationAId}/invitations`)
      .set(bearer(owner.accessToken))
      .send({ email: emails.pending, role: 'GUEST' })
      .expect(201);
    const invitationId = parseData<{ id: string }>(created.text).data.id;
    await request(app.getHttpServer())
      .delete(
        `/api/v1/organizations/${organizationAId}/invitations/${invitationId}`,
      )
      .set(bearer(owner.accessToken))
      .expect(200);

    await request(app.getHttpServer())
      .delete(
        `/api/v1/organizations/${organizationAId}/members/${memberMembershipId}`,
      )
      .set(bearer(owner.accessToken))
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationAId}`)
      .set(bearer(member.accessToken))
      .expect(403);
  });

  it('archives organizations only as OWNER and excludes them from active lists', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/organizations/${organizationAId}`)
      .set(bearer(owner.accessToken))
      .expect(200);
    await request(app.getHttpServer())
      .get(`/api/v1/organizations/${organizationAId}`)
      .set(bearer(owner.accessToken))
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/v1/organizations')
      .set(bearer(owner.accessToken))
      .expect(200)
      .expect(({ text }) => {
        const organizations = parseData<Array<{ id: string }>>(text).data;
        expect(organizations.map(({ id }) => id)).not.toContain(
          organizationAId,
        );
        expect(organizations.map(({ id }) => id)).toContain(organizationBId);
      });
  });

  async function register(email: string, firstName: string): Promise<Session> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, firstName, lastName: 'Tenant', password })
      .expect(201);
    const data = parseData<{
      accessToken: string;
      user: { id: string };
    }>(response.text).data;
    return { accessToken: data.accessToken, userId: data.user.id };
  }

  async function createOrganization(
    accessToken: string,
    name: string,
    slug: string,
  ): Promise<{ id: string; ownerId: string }> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set(bearer(accessToken))
      .send({ name, slug })
      .expect(201);
    return parseData<{ id: string; ownerId: string }>(response.text).data;
  }

  async function cleanup() {
    const users = await prisma.user.findMany({
      where: { email: { in: Object.values(emails) } },
      select: { id: true },
    });
    const userIds = users.map(({ id }) => id);
    const organizations = await prisma.organization.findMany({
      where: { slug: { in: ['phase-four-a', 'phase-four-b'] } },
      select: { id: true },
    });
    const organizationIds = organizations.map(({ id }) => id);
    if (organizationIds.length) {
      await prisma.outboxEvent.deleteMany({
        where: { organizationId: { in: organizationIds } },
      });
      await prisma.auditLog.deleteMany({
        where: { organizationId: { in: organizationIds } },
      });
      await prisma.organization.deleteMany({
        where: { id: { in: organizationIds } },
      });
    }
    if (userIds.length) {
      await prisma.outboxEvent.deleteMany({
        where: { aggregateId: { in: userIds } },
      });
      await prisma.auditLog.deleteMany({
        where: { entityId: { in: userIds } },
      });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
  }
});

interface Session {
  accessToken: string;
  userId: string;
}

function bearer(accessToken: string): { Authorization: string } {
  return { Authorization: `Bearer ${accessToken}` };
}

function parseData<T>(text: string): { data: T } {
  return JSON.parse(text) as { data: T };
}

function invitationEnvelope(event: OutboxEvent): EncryptedToken {
  const payload = event.payload as unknown as { token: EncryptedToken };
  return payload.token;
}
