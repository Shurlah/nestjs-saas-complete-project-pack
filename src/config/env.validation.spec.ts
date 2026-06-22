import { validateEnvironment } from './env.validation';

const validEnvironment = {
  DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/nest_saas',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  OUTBOX_ENCRYPTION_KEY: 'c'.repeat(32),
  REDIS_URL: 'redis://localhost:6379',
};

describe('validateEnvironment', () => {
  it('applies safe local defaults', () => {
    const environment = validateEnvironment(validEnvironment);

    expect(environment.PORT).toBe(3000);
    expect(environment.NODE_ENV).toBe('development');
    expect(environment.SMTP_PORT).toBe(1025);
  });

  it('rejects short JWT secrets', () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        JWT_ACCESS_SECRET: 'short',
      }),
    ).toThrow('Environment validation failed');
  });
});
