import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiOperation({ summary: 'Get current logged-in user profile' })
  async getProfile(@Req() req: any) {
    return this.profileService.getProfile(req.user.id);
  }

  @Patch()
  @ApiOperation({ summary: 'Update logged-in user profile (name, phone, avatar)' })
  async updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    return this.profileService.updateProfile(req.user.id, dto);
  }

  @Patch('change-password')
  @ApiOperation({ summary: 'Change password for logged-in user' })
  async changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    return this.profileService.changePassword(req.user.id, dto);
  }
}
