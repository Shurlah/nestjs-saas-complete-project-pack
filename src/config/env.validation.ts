import { z } from 'zod';

const environmentSchema = z.object({
  APP_URL: z.url().default('http://localhost:3000'),
  CORS_ORIGIN: z.string().min(1).default('http://localhost:3000'),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_EXPIRES_IN: z.string().min(1).default('15m'),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().min(1).default('7d'),
  JWT_REFRESH_SECRET: z.string().min(32),
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().positive().max(65_535).default(3000),
  OUTBOX_ENCRYPTION_KEY: z.string().min(32),
  REDIS_URL: z.string().min(1),
  SMTP_FROM: z.email().default('no-reply@example.com'),
  SMTP_HOST: z.string().min(1).default('localhost'),
  SMTP_PORT: z.coerce.number().int().positive().max(65_535).default(1025),
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

export type Environment = z.infer<typeof environmentSchema>;

export function validateEnvironment(
  configuration: Record<string, unknown>,
): Environment {
  const result = environmentSchema.safeParse(configuration);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');

    throw new Error(`Environment validation failed: ${issues}`);
  }

  return result.data;
}
