import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UploadDocumentDto {
  @ApiProperty({ example: 'Requirements_v1.pdf' })
  @IsString()
  @MaxLength(200)
  fileName: string;

  @ApiProperty({ example: 'application/pdf' })
  @IsString()
  @MaxLength(100)
  mimeType: string;

  @ApiProperty({ example: 1048576, description: 'File size in bytes' })
  @Type(() => Number)
  @IsNumber()
  fileSize: number;

  @ApiProperty({ example: 's3://bucket/path/to/file.pdf' })
  @IsString()
  fileUrl: string;

  @ApiProperty({ example: 'CONTRACT' })
  @IsString()
  documentType: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  leadId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  opportunityId?: string;
}
