import { IsArray, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReorderStagesDto {
  @ApiProperty({ description: 'Array of stage IDs in the new desired order', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsUUID('all', { each: true })
  stageIds: string[];
}
