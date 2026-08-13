import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export interface CurrentUserPayload {
  id: string;
  email?: string;
  roles?: string[];
  permissions?: string[];
}

/**
 * Extract the current user from the request.
 * The API Gateway is expected to inject x-user-id and x-user-email headers
 * after authentication. In the future, this may parse a JWT directly.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserPayload => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const userId = request.headers['x-user-id'] as string;
    const userEmail = request.headers['x-user-email'] as string;
    return {
      id: userId || 'system',
      email: userEmail,
    };
  },
);
