import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction } from '@prisma/client';
import { getTenantId, getUserId } from '../common/tenant-context/tenant-context.storage';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    entityType: string;
    entityId: string;
    action: AuditAction;
    performedBy?: string;
    oldData?: Record<string, unknown>;
    newData?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    tx?: Parameters<Parameters<PrismaService['$transaction']>[0]>[0];
  }): Promise<void> {
    const { entityType, entityId, action, performedBy, oldData, newData, metadata, tx } = params;
    const client = tx ?? this.prisma;
    const tenantId = getTenantId();
    const actorId = performedBy || getUserId();

    try {
      await (client as PrismaService).auditLog.create({
        data: {
          tenantId,
          entityType,
          entityId,
          action,
          performedBy: actorId,
          oldData: oldData as any,
          newData: newData as any,
          metadata: metadata as any,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to write audit log: ${(error as Error).message}`, {
        entityType,
        entityId,
        action,
      });
    }
  }

  async findByEntity(entityType: string, entityId: string) {
    const tenantId = getTenantId();
    return this.prisma.auditLog.findMany({
      where: {
        entityType,
        entityId,
        ...(tenantId ? { tenantId } : {}),
      },
      orderBy: { timestamp: 'desc' },
    });
  }

  async queryAuditLogs(entityType?: string, entityId?: string, action?: AuditAction, performedBy?: string) {
    const tenantId = getTenantId();
    const where: any = {
      ...(tenantId ? { tenantId } : {}),
    };

    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (action) where.action = action;
    if (performedBy) where.performedBy = performedBy;

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 100,
    });
  }
}
