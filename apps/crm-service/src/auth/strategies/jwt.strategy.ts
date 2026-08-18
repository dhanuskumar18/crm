import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (req) => req?.headers?.['x-access-token'] as string,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'super-secret-jwt-key-change-in-prod'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
      },
    });

    if (!user || user.status !== 'ACTIVE' || user.deletedAt) {
      throw new UnauthorizedException('User account is inactive or deleted');
    }

    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      roleId: user.roleId,
      roleName: user.role.name,
      permissions: user.role.permissions.map((p) => `${p.module}.${p.action}`),
    };
  }
}
