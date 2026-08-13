import { IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AssignLeadDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsUUID()
  assignedTo: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
