import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContactType, CustomerType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';

export class ConvertLeadCompanyDto {
  @ApiPropertyOptional()
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;
}

export class ConvertLeadContactDto {
  @ApiPropertyOptional()
  @IsString()
  firstName: string;

  @ApiPropertyOptional()
  @IsString()
  lastName: string;

  @ApiPropertyOptional()
  @IsEmail()
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  designation?: string;

  @ApiPropertyOptional({ enum: ContactType })
  @IsOptional()
  @IsEnum(ContactType)
  contactType?: ContactType;
}

export class ConvertLeadCustomerDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  accountManagerId?: string;

  @ApiPropertyOptional({ enum: CustomerType })
  @IsOptional()
  @IsEnum(CustomerType)
  customerType?: CustomerType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ConvertLeadDto {
  // ---- Company: use existing OR create new ----
  @ApiPropertyOptional({ format: 'uuid', description: 'Use an existing company' })
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiPropertyOptional({ description: 'Set to true to create a new company from lead data' })
  @IsOptional()
  @IsBoolean()
  createCompany?: boolean;

  @ApiPropertyOptional({ type: ConvertLeadCompanyDto, description: 'New company data (required if createCompany=true)' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ConvertLeadCompanyDto)
  company?: ConvertLeadCompanyDto;

  // ---- Contact: use existing OR create new ----
  @ApiPropertyOptional({ format: 'uuid', description: 'Use an existing contact' })
  @IsOptional()
  @IsUUID()
  contactId?: string;

  @ApiPropertyOptional({ description: 'Set to true to create a new contact from lead data' })
  @IsOptional()
  @IsBoolean()
  createContact?: boolean;

  @ApiPropertyOptional({ type: ConvertLeadContactDto, description: 'New contact data (required if createContact=true)' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ConvertLeadContactDto)
  contact?: ConvertLeadContactDto;

  // ---- Customer (always created on conversion) ----
  @ApiPropertyOptional({ type: ConvertLeadCustomerDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ConvertLeadCustomerDto)
  customer?: ConvertLeadCustomerDto;
}
