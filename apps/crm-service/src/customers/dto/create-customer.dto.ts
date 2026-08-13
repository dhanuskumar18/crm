import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
} from 'class-validator';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { CustomerStatus, CustomerType } from '@prisma/client';

export class CreateCustomerDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  companyId: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  primaryContactId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  accountManagerId?: string;

  @ApiPropertyOptional({ enum: CustomerStatus, default: CustomerStatus.ONBOARDING })
  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;

  @ApiPropertyOptional({ enum: CustomerType, default: CustomerType.BUSINESS })
  @IsOptional()
  @IsEnum(CustomerType)
  customerType?: CustomerType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  customerSince?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  billingCustomerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  salesCustomerId?: string;
}
