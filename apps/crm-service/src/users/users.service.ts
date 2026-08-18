import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { getTenantId } from '../common/tenant-context/tenant-context.storage';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Invite User to Tenant
   */
  async inviteUser(dto: InviteUserDto, inviterId: string) {
    const tenantId = getTenantId();
    if (!tenantId) {
      throw new BadRequestException('No tenant context found');
    }

    // Check if user email already exists in tenant
    const existingUser = await this.prisma.user.findFirst({
      where: { tenantId, email: dto.email.toLowerCase(), deletedAt: null },
    });
    if (existingUser) {
      throw new ConflictException(`User with email '${dto.email}' already exists in this tenant`);
    }

    // Check role exists
    const role = await this.prisma.role.findFirst({
      where: { id: dto.roleId, OR: [{ tenantId }, { tenantId: null }] },
    });
    if (!role) {
      throw new NotFoundException(`Role with ID '${dto.roleId}' not found`);
    }

    // Get Tenant name
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Generate token & expiry (7 days)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);

    const invite = await this.prisma.userInvite.create({
      data: {
        tenantId,
        email: dto.email.toLowerCase(),
        roleId: dto.roleId,
        invitedBy: inviterId,
        token,
        expiresAt,
      },
    });

    // Send Email
    await this.mailService.sendUserInviteEmail(dto.email, token, tenant.name);

    return {
      message: `Invitation sent to ${dto.email}`,
      inviteId: invite.id,
      devInviteLink:
        process.env.NODE_ENV !== 'production'
          ? `http://localhost:3000/accept-invite?token=${token}`
          : undefined,
    };
  }

  /**
   * Accept Invitation
   */
  async acceptInvite(dto: AcceptInviteDto) {
    const invite = await this.prisma.userInvite.findUnique({
      where: { token: dto.token },
      include: { tenant: true, role: true },
    });

    if (!invite || invite.status !== 'PENDING' || invite.expiresAt < new Date()) {
      throw new BadRequestException('Invitation is invalid or has expired');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      // 1. Create User
      const createdUser = await tx.user.create({
        data: {
          tenantId: invite.tenantId,
          email: invite.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          roleId: invite.roleId,
          status: 'ACTIVE',
          invitedBy: invite.invitedBy,
        },
      });

      // 2. Mark Invite as ACCEPTED
      await tx.userInvite.update({
        where: { id: invite.id },
        data: { status: 'ACCEPTED' },
      });

      return createdUser;
    });

    return {
      message: 'Account created successfully. You can now log in.',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  /**
   * List Users for current tenant
   */
  async listUsers(roleId?: string, status?: string, search?: string) {
    const tenantId = getTenantId();

    const where: any = {
      tenantId,
      deletedAt: null,
    };

    if (roleId) where.roleId = roleId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        role: {
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get User by ID
   */
  async getUserById(id: string) {
    const tenantId = getTenantId();

    const user = await this.prisma.user.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: {
        id: true,
        tenantId: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        role: {
          select: {
            id: true,
            name: true,
            description: true,
            permissions: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID '${id}' not found`);
    }

    return user;
  }

  /**
   * Deactivate User (prevents login, preserves audit trail)
   */
  async deactivateUser(id: string) {
    const tenantId = getTenantId();
    await this.getUserById(id);

    return this.prisma.user.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
  }

  /**
   * Activate User
   */
  async activateUser(id: string) {
    const tenantId = getTenantId();
    await this.getUserById(id);

    return this.prisma.user.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });
  }
}
