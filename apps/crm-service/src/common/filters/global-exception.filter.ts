import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { DomainException } from '../exceptions/domain.exceptions';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected error occurred';
    let details: unknown = undefined;

    if (exception instanceof DomainException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse() as {
        code: string;
        message: string;
        details?: unknown;
      };
      code = exceptionResponse.code;
      message = exceptionResponse.message;
      details = exceptionResponse.details;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const errObj = exceptionResponse as Record<string, unknown>;
        message = (errObj['message'] as string) || message;
        code = (errObj['error'] as string) || `HTTP_${status}`;
        details = errObj['message'];
      } else {
        message = String(exceptionResponse);
        code = `HTTP_${status}`;
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack);
    }

    this.logger.error({
      requestId: request.headers['x-request-id'],
      method: request.method,
      path: request.url,
      statusCode: status,
      code,
      message,
    });

    response.status(status).json({
      success: false,
      error: {
        code,
        message,
        ...(details !== undefined && details !== message ? { details } : {}),
      },
    });
  }
}
