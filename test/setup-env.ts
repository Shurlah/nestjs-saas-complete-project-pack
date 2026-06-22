process.env.DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5432/nest_saas_test';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_ACCESS_SECRET = 'a'.repeat(32);
process.env.JWT_REFRESH_SECRET = 'b'.repeat(32);
process.env.OUTBOX_ENCRYPTION_KEY = 'c'.repeat(32);
