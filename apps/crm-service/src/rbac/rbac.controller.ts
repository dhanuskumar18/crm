import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RbacService } from './rbac.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';

@ApiTags('RBAC')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('roles')
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  @Get()
  @RequirePermissions('users.view')
  @ApiOperation({ summary: 'List all organization roles and permission counts' })
  async getRoles() {
    return this.rbacService.getRoles();
  }

  @Get(':id')
  @RequirePermissions('users.view')
  @ApiOperation({ summary: 'Get detailed role breakdown with permissions and assigned users' })
  async getRoleById(@Param('id') id: string) {
    return this.rbacService.getRoleById(id);
  }
}
