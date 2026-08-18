import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import proxy from 'express-http-proxy';

@Injectable()
export class ProxyMiddleware implements NestMiddleware {
  private proxyHandler = proxy(process.env.CRM_SERVICE_URL || 'http://localhost:3001', {
    proxyReqPathResolver: (req) => req.originalUrl,
  });

  use(req: Request, res: Response, next: NextFunction) {
    this.proxyHandler(req, res, next);
  }
}
