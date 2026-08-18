import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class InviteUserDto {
  @ApiProperty({ example: 'newuser@acme.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'ID of the Role to assign to the user' })
  @IsUUID()
  @IsNotEmpty()
  roleId: string;

  @ApiProperty({ example: 'Jane', required: false })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({ example: 'Smith', required: false })
  @IsString()
  @IsOptional()
  lastName?: string;
}
