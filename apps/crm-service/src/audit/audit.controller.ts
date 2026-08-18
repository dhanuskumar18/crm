import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { AuditAction } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermissions('audit.view')
  @ApiOperation({ summary: 'Query audit logs for compliance and security' })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'entityId', required: false })
  @ApiQuery({ name: 'action', required: false, enum: AuditAction })
  @ApiQuery({ name: 'performedBy', required: false })
  async getAuditLogs(
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('action') action?: AuditAction,
    @Query('performedBy') performedBy?: string,
  ) {
    return this.auditService.queryAuditLogs(entityType, entityId, action, performedBy);
  }
}
