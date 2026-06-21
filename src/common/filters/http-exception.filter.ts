import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorBody {
  error?: string;
  message?: string | string[];
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = isHttpException
      ? exception.getResponse()
      : undefined;
    const errorBody: ErrorBody =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? exceptionResponse
        : {};
    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (errorBody.message ?? 'Internal server error');
    const requestId = response.getHeader('X-Request-Id');

    response.status(statusCode).json({
      statusCode,
      message,
      error: errorBody.error ?? HttpStatus[statusCode] ?? 'Error',
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
      requestId: typeof requestId === 'string' ? requestId : null,
    });
  }
}
