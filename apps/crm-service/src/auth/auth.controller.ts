import { Controller, Post, Body, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Public } from './decorators/public.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new organization tenant & Super Admin user' })
  @ApiResponse({ status: 201, description: 'Tenant & User registered successfully' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User Login' })
  @ApiResponse({ status: 200, description: 'Returns access & refresh tokens' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const userAgent = req.headers['user-agent'];
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    return this.authService.login(dto, userAgent, ipAddress);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh Access Token' })
  @ApiResponse({ status: 200, description: 'Returns new access & refresh tokens' })
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    const userAgent = req.headers['user-agent'];
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    return this.authService.refreshTokens(dto, userAgent, ipAddress);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  @ApiResponse({ status: 200, description: 'Revokes refresh token' })
  async logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset link' })
  @ApiResponse({ status: 200, description: 'Sends password reset link via email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using token' })
  @ApiResponse({ status: 200, description: 'Resets user password' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}
