import { Module, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import { IncomingMessage, ServerResponse } from 'node:http';
import { validateEnvironment } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      validate: validateEnvironment,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    LoggerModule.forRoot({
      forRoutes: [{ path: '*path', method: RequestMethod.ALL }],
      pinoHttp: {
        autoLogging: true,
        genReqId: (request: IncomingMessage, response: ServerResponse) => {
          const incomingRequestId = request.headers['x-request-id'];
          const requestId =
            typeof incomingRequestId === 'string' &&
            incomingRequestId.length > 0
              ? incomingRequestId
              : randomUUID();

          response.setHeader('X-Request-Id', requestId);
          return requestId;
        },
        redact: {
          paths: [
            'req.headers.authorization',
            'req.body.password',
            'req.body.currentPassword',
            'req.body.newPassword',
            'req.body.accessToken',
            'req.body.refreshToken',
            'req.body.token',
          ],
          censor: '[REDACTED]',
        },
      },
    }),
    DatabaseModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
