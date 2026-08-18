import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @RequirePermissions('settings.view')
  @ApiOperation({ summary: 'Get all base system & tenant settings' })
  async getSettings() {
    return this.settingsService.getSettings();
  }

  @Get(':key')
  @RequirePermissions('settings.view')
  @ApiOperation({ summary: 'Get specific setting by key' })
  async getSettingByKey(@Param('key') key: string) {
    return this.settingsService.getSettingByKey(key);
  }

  @Put(':key')
  @RequirePermissions('settings.edit')
  @ApiOperation({ summary: 'Update or create base setting' })
  async updateSetting(@Param('key') key: string, @Body() dto: UpdateSettingDto) {
    return this.settingsService.updateSetting(key, dto);
  }
}
