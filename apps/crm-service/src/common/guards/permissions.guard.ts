import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

/**
 * Permission guard — ready for integration with the Auth service.
 * Currently passes all requests; permissions are checked against
 * x-user-permissions header injected by the API Gateway.
 *
 * TODO: Integrate with Auth service JWT validation when available.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ headers: Record<string, string> }>();
    const userPermissionsHeader = request.headers['x-user-permissions'];

    if (!userPermissionsHeader) {
      // In development mode, allow all. In production, this should reject.
      this.logger.warn(
        `No permissions header found. Required: ${requiredPermissions.join(', ')}. Allowing in current mode.`,
      );
      return true;
    }

    const userPermissions = userPermissionsHeader.split(',').map((p) => p.trim());
    return requiredPermissions.every((perm) => userPermissions.includes(perm));
  }
}
