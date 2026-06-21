import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

export interface ApiResponse<T> {
  success: true;
  message: string;
  data: T;
}

export interface ResponsePayload<T> {
  data: T;
  message: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  ResponsePayload<T>,
  ApiResponse<T>
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<ResponsePayload<T>>,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map(({ data, message }) => ({
        success: true as const,
        message,
        data,
      })),
    );
  }
}
