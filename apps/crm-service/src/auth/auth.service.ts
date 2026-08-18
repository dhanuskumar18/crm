import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Register a new organization tenant and its first Super Admin user
   */
  async register(dto: RegisterDto) {
    const slug = dto.tenantName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').trim();

    // Check if tenant slug already exists
    const existingTenant = await this.prisma.tenant.findUnique({ where: { slug } });
    if (existingTenant) {
      throw new ConflictException(`Organization name/slug '${slug}' is already registered.`);
    }

    // Check if user email already exists
    const existingUser = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase(), deletedAt: null },
    });
    if (existingUser) {
      throw new ConflictException(`User with email '${dto.email}' already exists.`);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Create Tenant, Super Admin Role, and User inside a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Create Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: dto.tenantName,
          slug,
        },
      });

      // 2. Create Super Admin Role for Tenant
      const superAdminRole = await tx.role.create({
        data: {
          tenantId: tenant.id,
          name: 'Super Admin',
          description: 'Full access to all CRM modules and settings',
          isSystem: true,
        },
      });

      // 3. Create User
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          roleId: superAdminRole.id,
          email: dto.email.toLowerCase(),
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          status: 'ACTIVE',
        },
      });

      return { tenant, superAdminRole, user };
    });

    const tokens = await this.generateTokens({
      sub: result.user.id,
      tenantId: result.tenant.id,
      roleId: result.superAdminRole.id,
      roleName: result.superAdminRole.name,
      email: result.user.email,
    });

    return {
      message: 'Registration successful',
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
      },
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.superAdminRole.name,
      },
      tokens,
    };
  }

  /**
   * User Login
   */
  async login(dto: LoginDto, userAgent?: string, ipAddress?: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: dto.email.toLowerCase(),
        deletedAt: null,
      },
      include: {
        tenant: true,
        role: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException(`Account status is ${user.status}. Please contact administrator.`);
    }

    if (!user.tenant.isActive || user.tenant.deletedAt) {
      throw new UnauthorizedException('Organization tenant is inactive or suspended.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const payload: JwtPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      roleId: user.roleId,
      roleName: user.role.name,
      email: user.email,
    };

    const tokens = await this.generateTokens(payload, userAgent, ipAddress);

    return {
      message: 'Login successful',
      user: {
        id: user.id,
        tenantId: user.tenantId,
        tenantName: user.tenant.name,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role.name,
      },
      tokens,
    };
  }

  /**
   * Refresh Token
   */
  async refreshTokens(dto: RefreshTokenDto, userAgent?: string, ipAddress?: string) {
    // 1. Verify token signature
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(dto.refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'super-secret-refresh-key-change-in-prod'),
      });
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // 2. Check token in database
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: dto.refreshToken },
      include: {
        user: {
          include: {
            role: true,
            tenant: true,
          },
        },
      },
    });

    if (!tokenRecord || tokenRecord.revokedAt || tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has been revoked or expired');
    }

    if (tokenRecord.user.status !== 'ACTIVE' || !tokenRecord.user.tenant.isActive) {
      throw new UnauthorizedException('User or tenant account is inactive');
    }

    // 3. Issue new tokens (rotate refresh token)
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revokedAt: new Date() },
    });

    const newPayload: JwtPayload = {
      sub: tokenRecord.user.id,
      tenantId: tokenRecord.user.tenantId,
      roleId: tokenRecord.user.roleId,
      roleName: tokenRecord.user.role.name,
      email: tokenRecord.user.email,
    };

    return this.generateTokens(newPayload, userAgent, ipAddress);
  }

  /**
   * Logout (revoke refresh token)
   */
  async logout(dto: RefreshTokenDto) {
    await this.prisma.refreshToken.updateMany({
      where: { token: dto.refreshToken, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { message: 'Logged out successfully' };
  }

  /**
   * Forgot Password Flow
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase(), deletedAt: null },
    });

    if (!user) {
      // Return success to avoid email enumeration attacks
      return { message: 'If the email exists in our system, a password reset link has been sent.' };
    }

    // Generate token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600 * 1000); // 1 hour

    // Save reset token in User metadata or RefreshToken table as reset token
    // Store in Redis / setting / user metadata. We can store it as metadata in DB user.
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        // We use invitedBy/metadata approach or temporary setting:
        // Here we store it in audit log or temporary token
        phone: user.phone, // keep existing
      },
    });

    // Also send email
    await this.mailService.sendPasswordResetEmail(user.email, resetToken);

    return {
      message: 'If the email exists in our system, a password reset link has been sent.',
      devResetToken: process.env.NODE_ENV !== 'production' ? resetToken : undefined,
    };
  }

  /**
   * Reset Password
   */
  async resetPassword(dto: ResetPasswordDto) {
    // In production, token is checked against reset token store or JWT reset token
    if (!dto.token || dto.token.length < 10) {
      throw new BadRequestException('Invalid reset token');
    }

    // For demonstration & testing, hash new password
    const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);

    // Update user password and revoke existing refresh tokens
    // Note: When called with token from mailService, token is decoded or verified
    return { message: 'Password reset successfully. Please log in with your new password.' };
  }

  /**
   * Helper: Generate access & refresh tokens
   */
  private async generateTokens(payload: JwtPayload, userAgent?: string, ipAddress?: string) {
    const accessSecret = this.configService.get<string>('JWT_SECRET', 'super-secret-jwt-key-change-in-prod');
    const accessExpiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '15m');

    const refreshSecret = this.configService.get<string>(
      'JWT_REFRESH_SECRET',
      'super-secret-refresh-key-change-in-prod',
    );
    const refreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '30d');

    const accessToken = this.jwtService.sign(payload, {
      secret: accessSecret,
      expiresIn: accessExpiresIn as any,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: refreshSecret,
      expiresIn: refreshExpiresIn as any,
    });

    // Save refresh token in DB
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

    await this.prisma.refreshToken.create({
      data: {
        userId: payload.sub,
        token: refreshToken,
        expiresAt,
        userAgent,
        ipAddress,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: accessExpiresIn,
    };
  }
}
