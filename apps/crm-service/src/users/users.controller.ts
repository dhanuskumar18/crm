import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('invite')
  @RequirePermissions('users.create')
  @ApiOperation({ summary: 'Invite a new user to the organization' })
  async inviteUser(@Body() dto: InviteUserDto, @Req() req: any) {
    const inviterId = req.user.id;
    return this.usersService.inviteUser(dto, inviterId);
  }

  @Public()
  @Post('accept-invite')
  @ApiOperation({ summary: 'Accept invitation and set up user password' })
  async acceptInvite(@Body() dto: AcceptInviteDto) {
    return this.usersService.acceptInvite(dto);
  }

  @Get()
  @RequirePermissions('users.view')
  @ApiOperation({ summary: 'List users in the organization' })
  @ApiQuery({ name: 'roleId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  async listUsers(
    @Query('roleId') roleId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.usersService.listUsers(roleId, status, search);
  }

  @Get(':id')
  @RequirePermissions('users.view')
  @ApiOperation({ summary: 'Get user details by ID' })
  async getUserById(@Param('id') id: string) {
    return this.usersService.getUserById(id);
  }

  @Patch(':id/deactivate')
  @RequirePermissions('users.edit')
  @ApiOperation({ summary: 'Deactivate user account (blocks login, preserves audit log)' })
  async deactivateUser(@Param('id') id: string) {
    return this.usersService.deactivateUser(id);
  }

  @Patch(':id/activate')
  @RequirePermissions('users.edit')
  @ApiOperation({ summary: 'Reactivate user account' })
  async activateUser(@Param('id') id: string) {
    return this.usersService.activateUser(id);
  }
}
