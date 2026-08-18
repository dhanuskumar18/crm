import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
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
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
          },
        },
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

    if (!user || user.deletedAt) {
      throw new NotFoundException('User profile not found');
    }

    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        avatar: dto.avatar,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
      },
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isMatch = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('Current password is incorrect');
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    // Revoke current active refresh tokens
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return { message: 'Password changed successfully' };
  }
}
