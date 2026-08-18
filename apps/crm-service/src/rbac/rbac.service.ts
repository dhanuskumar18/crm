import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_ROLES } from './constants/default-roles';
import { getTenantId } from '../common/tenant-context/tenant-context.storage';

@Injectable()
export class RbacService {
  private readonly logger = new Logger(RbacService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Seed default 8 roles for a tenant if they do not exist
   */
  async seedRolesForTenant(tenantId: string) {
    this.logger.log(`Seeding default RBAC roles for tenant: ${tenantId}`);

    for (const roleDef of DEFAULT_ROLES) {
      let role = await this.prisma.role.findFirst({
        where: { tenantId, name: roleDef.name },
      });

      if (!role) {
        role = await this.prisma.role.create({
          data: {
            tenantId,
            name: roleDef.name,
            description: roleDef.description,
            isSystem: true,
          },
        });
      }

      // Upsert permissions
      for (const perm of roleDef.permissions) {
        await this.prisma.rolePermission.upsert({
          where: {
            roleId_module_action: {
              roleId: role.id,
              module: perm.module,
              action: perm.action,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            module: perm.module,
            action: perm.action,
          },
        });
      }
    }
  }

  /**
   * List all roles available for current tenant
   */
  async getRoles() {
    const tenantId = getTenantId();

    return this.prisma.role.findMany({
      where: {
        OR: [{ tenantId }, { tenantId: null }],
      },
      include: {
        permissions: {
          select: {
            module: true,
            action: true,
          },
        },
        _count: {
          select: { users: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get role details by ID
   */
  async getRoleById(id: string) {
    const tenantId = getTenantId();

    const role = await this.prisma.role.findFirst({
      where: {
        id,
        OR: [{ tenantId }, { tenantId: null }],
      },
      include: {
        permissions: true,
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            status: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`Role with ID '${id}' not found`);
    }

    return role;
  }
}
