import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class AcceptInviteDto {
  @ApiProperty({ description: 'Invitation token received via email' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'SecurePassword123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Jane' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Smith' })
  @IsString()
  @IsNotEmpty()
  lastName: string;
}
