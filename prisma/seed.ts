import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'argon2';
import {
  AuditAction,
  MembershipStatus,
  NotificationType,
  OrganizationRole,
  PrismaClient,
  ProjectStatus,
  TaskPriority,
  TaskStatus,
} from '@prisma/client';

const ids = {
  users: {
    owner: '00000000-0000-4000-8000-000000000001',
    admin: '00000000-0000-4000-8000-000000000002',
    manager: '00000000-0000-4000-8000-000000000003',
    member: '00000000-0000-4000-8000-000000000004',
    guest: '00000000-0000-4000-8000-000000000005',
  },
  organization: '00000000-0000-4000-8000-000000000100',
  teams: [
    '00000000-0000-4000-8000-000000000301',
    '00000000-0000-4000-8000-000000000302',
  ],
  projects: [
    '00000000-0000-4000-8000-000000000401',
    '00000000-0000-4000-8000-000000000402',
  ],
} as const;

const users = [
  {
    id: ids.users.owner,
    email: 'owner@example.com',
    firstName: 'Olivia',
    lastName: 'Owner',
    role: OrganizationRole.OWNER,
  },
  {
    id: ids.users.admin,
    email: 'admin@example.com',
    firstName: 'Amina',
    lastName: 'Admin',
    role: OrganizationRole.ADMIN,
  },
  {
    id: ids.users.manager,
    email: 'manager@example.com',
    firstName: 'Peter',
    lastName: 'Manager',
    role: OrganizationRole.PROJECT_MANAGER,
  },
  {
    id: ids.users.member,
    email: 'member@example.com',
    firstName: 'Mary',
    lastName: 'Member',
    role: OrganizationRole.MEMBER,
  },
  {
    id: ids.users.guest,
    email: 'guest@example.com',
    firstName: 'Grace',
    lastName: 'Guest',
    role: OrganizationRole.GUEST,
  },
] as const;

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is required to seed the database');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const passwordHash = await hash('Password@123');

    await prisma.$transaction(async (transaction) => {
      const tenant = { organizationId: ids.organization };

      await transaction.comment.deleteMany({ where: tenant });
      await transaction.task.deleteMany({ where: tenant });
      await transaction.projectMember.deleteMany({ where: tenant });
      await transaction.project.deleteMany({ where: tenant });
      await transaction.teamMember.deleteMany({ where: tenant });
      await transaction.team.deleteMany({ where: tenant });
      await transaction.invitation.deleteMany({ where: tenant });
      await transaction.notification.deleteMany({ where: tenant });
      await transaction.activityLog.deleteMany({ where: tenant });
      await transaction.auditLog.deleteMany({
        where: {
          OR: [tenant, { entityId: ids.organization }],
        },
      });
      await transaction.outboxEvent.deleteMany({ where: tenant });
      await transaction.membership.deleteMany({ where: tenant });
      await transaction.organization.deleteMany({
        where: { id: ids.organization },
      });
    });

    for (const user of users) {
      await prisma.user.upsert({
        where: { email: user.email },
        update: {
          firstName: user.firstName,
          lastName: user.lastName,
          passwordHash,
          isEmailVerified: true,
          deletedAt: null,
        },
        create: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          passwordHash,
          isEmailVerified: true,
        },
      });
    }

    await prisma.organization.create({
      data: {
        id: ids.organization,
        name: 'Acme Project Labs',
        slug: 'acme-project-labs',
        ownerId: ids.users.owner,
      },
    });

    await prisma.membership.createMany({
      data: users.map((user, index) => ({
        id: `00000000-0000-4000-8000-00000000020${index + 1}`,
        organizationId: ids.organization,
        userId: user.id,
        role: user.role,
        status: MembershipStatus.ACTIVE,
        joinedAt: new Date('2026-06-21T00:00:00.000Z'),
      })),
    });

    await prisma.team.createMany({
      data: [
        {
          id: ids.teams[0],
          organizationId: ids.organization,
          name: 'Platform Team',
          description: 'Core backend and platform engineering',
        },
        {
          id: ids.teams[1],
          organizationId: ids.organization,
          name: 'Product Team',
          description: 'Product delivery and customer workflows',
        },
      ],
    });

    await prisma.teamMember.createMany({
      data: [
        {
          organizationId: ids.organization,
          teamId: ids.teams[0],
          userId: ids.users.manager,
        },
        {
          organizationId: ids.organization,
          teamId: ids.teams[0],
          userId: ids.users.member,
        },
        {
          organizationId: ids.organization,
          teamId: ids.teams[1],
          userId: ids.users.admin,
        },
      ],
    });

    await prisma.project.createMany({
      data: [
        {
          id: ids.projects[0],
          organizationId: ids.organization,
          teamId: ids.teams[0],
          name: 'SaaS API',
          key: 'API',
          description: 'Multi-tenant project management API',
          status: ProjectStatus.ACTIVE,
          startDate: new Date('2026-06-21T00:00:00.000Z'),
          dueDate: new Date('2026-09-30T00:00:00.000Z'),
        },
        {
          id: ids.projects[1],
          organizationId: ids.organization,
          teamId: ids.teams[1],
          name: 'Customer Portal',
          key: 'WEB',
          description: 'Customer-facing project workspace',
          status: ProjectStatus.PLANNING,
          startDate: new Date('2026-07-01T00:00:00.000Z'),
        },
      ],
    });

    await prisma.projectMember.createMany({
      data: [
        {
          organizationId: ids.organization,
          projectId: ids.projects[0],
          userId: ids.users.manager,
        },
        {
          organizationId: ids.organization,
          projectId: ids.projects[0],
          userId: ids.users.member,
        },
        {
          organizationId: ids.organization,
          projectId: ids.projects[1],
          userId: ids.users.guest,
        },
      ],
    });

    await prisma.task.createMany({
      data: Array.from({ length: 10 }, (_, index) => ({
        id: `00000000-0000-4000-8000-0000000005${String(index + 1).padStart(2, '0')}`,
        organizationId: ids.organization,
        projectId: index < 7 ? ids.projects[0] : ids.projects[1],
        title: `Sample task ${index + 1}`,
        description: `Seeded task ${index + 1} for local development`,
        status: index < 2 ? TaskStatus.IN_PROGRESS : TaskStatus.TODO,
        priority: index === 0 ? TaskPriority.HIGH : TaskPriority.MEDIUM,
        assigneeId: index < 7 ? ids.users.member : ids.users.admin,
        createdById: index < 7 ? ids.users.manager : ids.users.admin,
        dueDate: new Date(
          `2026-08-${String(index + 1).padStart(2, '0')}T12:00:00.000Z`,
        ),
      })),
    });

    await prisma.comment.createMany({
      data: Array.from({ length: 5 }, (_, index) => ({
        id: `00000000-0000-4000-8000-00000000060${index + 1}`,
        organizationId: ids.organization,
        taskId: `00000000-0000-4000-8000-0000000005${String(index + 1).padStart(2, '0')}`,
        authorId: ids.users.member,
        body: `Sample comment ${index + 1}`,
      })),
    });

    await prisma.notification.create({
      data: {
        organizationId: ids.organization,
        userId: ids.users.member,
        type: NotificationType.TASK_ASSIGNED,
        title: 'Task assigned',
        message: 'You have been assigned Sample task 1',
        metadata: { taskId: '00000000-0000-4000-8000-000000000501' },
      },
    });

    await prisma.activityLog.create({
      data: {
        organizationId: ids.organization,
        actorId: ids.users.owner,
        action: 'organization.created',
        entityType: 'Organization',
        entityId: ids.organization,
        message: 'Acme Project Labs was created',
      },
    });

    await prisma.auditLog.create({
      data: {
        id: '00000000-0000-4000-8000-000000000801',
        organizationId: ids.organization,
        actorId: ids.users.owner,
        action: AuditAction.ORGANIZATION_CREATED,
        entityType: 'Organization',
        entityId: ids.organization,
      },
    });

    console.info('Database seeded successfully');
  } finally {
    await prisma.$disconnect();
  }
}

void main();
