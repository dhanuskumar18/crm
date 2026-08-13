import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction } from '@prisma/client';

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

    try {
      await (client as PrismaService).auditLog.create({
        data: {
          entityType,
          entityId,
          action,
          performedBy,
          oldData: oldData as any,
          newData: newData as any,
          metadata: metadata as any,
        },
      });
    } catch (error) {
      // Audit failures should NOT fail the primary operation
      this.logger.error(`Failed to write audit log: ${(error as Error).message}`, {
        entityType,
        entityId,
        action,
      });
    }
  }

  async findByEntity(entityType: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { timestamp: 'desc' },
    });
  }
}
