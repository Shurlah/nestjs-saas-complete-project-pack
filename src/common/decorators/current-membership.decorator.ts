import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Membership } from '@prisma/client';
import type { Request } from 'express';

export const CurrentMembership = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Membership => {
    const request = context
      .switchToHttp()
      .getRequest<Request & { membership: Membership }>();
    return request.membership;
  },
);
