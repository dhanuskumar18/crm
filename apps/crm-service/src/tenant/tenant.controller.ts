import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantService } from './tenant.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@ApiTags('Tenant')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('tenant')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get()
  @ApiOperation({ summary: 'Get current organization tenant profile & stats' })
  async getCurrentTenant() {
    return this.tenantService.getCurrentTenant();
  }

  @Patch()
  @RequirePermissions('settings.edit')
  @ApiOperation({ summary: 'Update organization tenant profile' })
  async updateCurrentTenant(@Body() dto: UpdateTenantDto) {
    return this.tenantService.updateCurrentTenant(dto);
  }
}
