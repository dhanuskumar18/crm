import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { getTenantId } from '../common/tenant-context/tenant-context.storage';

export const DEFAULT_SETTINGS = [
  { key: 'company_name', value: 'My Company', type: 'string', description: 'Organization legal/trading name' },
  { key: 'default_currency', value: 'USD', type: 'string', description: 'Default system billing & reporting currency' },
  { key: 'fiscal_year_start', value: 'January', type: 'string', description: 'Starting month of the fiscal accounting year' },
  { key: 'date_format', value: 'YYYY-MM-DD', type: 'string', description: 'Default UI date format display' },
  { key: 'timezone', value: 'UTC', type: 'string', description: 'Default system timezone for activities and dates' },
];

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Seed default base settings for tenant
   */
  async seedDefaultSettings(tenantId: string) {
    for (const setting of DEFAULT_SETTINGS) {
      await this.prisma.setting.upsert({
        where: {
          tenantId_key: {
            tenantId,
            key: setting.key,
          },
        },
        update: {},
        create: {
          tenantId,
          key: setting.key,
          value: setting.value,
          type: setting.type,
          description: setting.description,
        },
      });
    }
  }

  /**
   * Get all settings for current tenant
   */
  async getSettings() {
    const tenantId = getTenantId();
    if (!tenantId) {
      throw new BadRequestException('Tenant context required');
    }

    let settings = await this.prisma.setting.findMany({
      where: { tenantId },
      orderBy: { key: 'asc' },
    });

    if (settings.length === 0) {
      await this.seedDefaultSettings(tenantId);
      settings = await this.prisma.setting.findMany({
        where: { tenantId },
        orderBy: { key: 'asc' },
      });
    }

    return settings;
  }

  /**
   * Get single setting by key
   */
  async getSettingByKey(key: string) {
    const tenantId = getTenantId();
    if (!tenantId) {
      throw new BadRequestException('Tenant context required');
    }

    const setting = await this.prisma.setting.findUnique({
      where: {
        tenantId_key: {
          tenantId,
          key,
        },
      },
    });

    if (!setting) {
      throw new NotFoundException(`Setting with key '${key}' not found`);
    }

    return setting;
  }

  /**
   * Update or Upsert single setting
   */
  async updateSetting(key: string, dto: UpdateSettingDto) {
    const tenantId = getTenantId();
    if (!tenantId) {
      throw new BadRequestException('Tenant context required');
    }

    return this.prisma.setting.upsert({
      where: {
        tenantId_key: {
          tenantId,
          key,
        },
      },
      update: {
        value: dto.value,
        type: dto.type,
        description: dto.description,
      },
      create: {
        tenantId,
        key,
        value: dto.value,
        type: dto.type || 'string',
        description: dto.description,
      },
    });
  }
}
