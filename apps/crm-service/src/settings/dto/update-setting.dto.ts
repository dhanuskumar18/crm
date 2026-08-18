import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateSettingDto {
  @ApiProperty({ example: 'USD' })
  @IsString()
  @IsNotEmpty()
  value: string;

  @ApiProperty({ example: 'string', required: false })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiProperty({ example: 'Default system currency', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
