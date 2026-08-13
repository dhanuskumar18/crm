import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MoveStageDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  stageId: string;
}

export class MarkOpportunityLostDto {
  @ApiProperty()
  @IsString()
  lostReason: string;
}
