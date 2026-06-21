import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApplication } from '../src/app.setup';

describe('Health API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  it('GET /api/v1/health', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect(({ body }) => {
        const responseBody: unknown = body;

        expect(responseBody).toMatchObject({
          success: true,
          message: 'Service is healthy',
          data: {
            status: 'ok',
          },
        });
      });
  });

  it('GET /api/docs', async () => {
    await request(app.getHttpServer())
      .get('/api/docs')
      .expect(200)
      .expect('content-type', /html/);
  });

  afterAll(async () => {
    await app.close();
  });
});
