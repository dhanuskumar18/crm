import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateProfileDto {
  @ApiProperty({ example: 'John', required: false })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({ example: 'Doe', required: false })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({ example: '+1234567890', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 'https://cdn.acme.com/avatars/user.jpg', required: false })
  @IsString()
  @IsOptional()
  avatar?: string;
}
