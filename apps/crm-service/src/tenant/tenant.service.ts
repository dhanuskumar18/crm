import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { getTenantId } from '../common/tenant-context/tenant-context.storage';

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentTenant() {
    const tenantId = getTenantId();
    if (!tenantId) {
      throw new BadRequestException('No tenant context found');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        _count: {
          select: {
            users: true,
            companies: true,
            contacts: true,
            leads: true,
            customers: true,
          },
        },
      },
    });

    if (!tenant || tenant.deletedAt) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  async updateCurrentTenant(dto: UpdateTenantDto) {
    const tenantId = getTenantId();
    if (!tenantId) {
      throw new BadRequestException('No tenant context found');
    }

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: dto,
    });
  }
}
