import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, headers } = request;
    const requestId = headers['x-request-id'] || '';
    const userId = headers['x-user-id'] || '';
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse<{ statusCode: number }>();
          const duration = Date.now() - startTime;
          this.logger.log({
            requestId,
            userId,
            method,
            path: url,
            statusCode: response.statusCode,
            duration: `${duration}ms`,
            service: 'crm-service',
          });
        },
        error: (error: Error) => {
          const duration = Date.now() - startTime;
          this.logger.error({
            requestId,
            userId,
            method,
            path: url,
            duration: `${duration}ms`,
            error: error.message,
          });
        },
      }),
    );
  }
}
