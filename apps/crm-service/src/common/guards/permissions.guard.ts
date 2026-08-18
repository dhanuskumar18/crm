import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as { roleName?: string; permissions?: string[] } | undefined;

    // Check header override for development/gateway proxy if present
    const headerPermissions = request.headers['x-user-permissions'] as string;
    const permissions = user?.permissions || (headerPermissions ? headerPermissions.split(',').map((p) => p.trim()) : []);

    if (user?.roleName === 'Super Admin') {
      return true;
    }

    const hasPermission = requiredPermissions.every((perm) => permissions.includes(perm));

    if (!hasPermission) {
      throw new ForbiddenException(
        `Insufficient permissions. Required: [${requiredPermissions.join(', ')}]`,
      );
    }

    return true;
  }
}
