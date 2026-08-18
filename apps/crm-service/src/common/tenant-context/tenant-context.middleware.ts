import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { tenantContextStorage } from './tenant-context.storage';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const user = req.user as { tenantId?: string; id?: string } | undefined;
    const headerTenantId = req.headers['x-tenant-id'] as string;
    const headerUserId = req.headers['x-user-id'] as string;

    const tenantId = user?.tenantId || headerTenantId;
    const userId = user?.id || headerUserId;

    if (tenantId) {
      tenantContextStorage.run({ tenantId, userId }, () => {
        next();
      });
    } else {
      next();
    }
  }
}
