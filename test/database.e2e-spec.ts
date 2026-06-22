import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/app.setup';
import { PrismaService } from '../src/database/prisma.service';
import { OrganizationRole } from '@prisma/client';

const testIds = {
  users: [
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002',
  ],
  organizations: [
    '10000000-0000-4000-8000-000000000101',
    '10000000-0000-4000-8000-000000000102',
  ],
  team: '10000000-0000-4000-8000-000000000201',
} as const;

describe('Database tenant constraints (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();
    prisma = app.get(PrismaService);

    await prisma.user.createMany({
      data: testIds.users.map((id, index) => ({
        id,
        email: `tenant-test-${index + 1}@example.com`,
        firstName: 'Tenant',
        lastName: `User ${index + 1}`,
        passwordHash: 'not-used-in-database-tests',
      })),
    });

    await prisma.organization.createMany({
      data: testIds.organizations.map((id, index) => ({
        id,
        name: `Tenant ${index + 1}`,
        slug: `tenant-constraint-test-${index + 1}`,
        ownerId: testIds.users[index],
      })),
    });

    await prisma.membership.createMany({
      data: testIds.organizations.map((organizationId, index) => ({
        organizationId,
        userId: testIds.users[index],
        role: OrganizationRole.OWNER,
      })),
    });

    await prisma.team.create({
      data: {
        id: testIds.team,
        organizationId: testIds.organizations[0],
        name: 'Tenant A Team',
      },
    });
  });

  afterAll(async () => {
    await prisma.organization.deleteMany({
      where: { id: { in: [...testIds.organizations] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [...testIds.users] } },
    });
    await app.close();
  });

  it('rejects a project linked to a team from another organization', async () => {
    await expect(
      prisma.project.create({
        data: {
          organizationId: testIds.organizations[1],
          teamId: testIds.team,
          name: 'Invalid cross-tenant project',
          key: 'INVALID',
        },
      }),
    ).rejects.toMatchObject({ code: 'P2003' });
  });
});
