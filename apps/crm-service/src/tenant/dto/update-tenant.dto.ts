import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateTenantDto {
  @ApiProperty({ example: 'Acme Corporation', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: 'https://cdn.acme.com/logo.png', required: false })
  @IsString()
  @IsOptional()
  logo?: string;

  @ApiProperty({ example: 'acme.crm.com', required: false })
  @IsString()
  @IsOptional()
  domain?: string;
}
