import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';

@Module({
  controllers: [UsersController, ProfileController],
  providers: [UsersService, ProfileService],
  exports: [UsersService, ProfileService],
})
export class UsersModule {}
