import { IsHexColor, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTagDto {
  @ApiProperty({ example: 'VIP' })
  @IsString()
  @MaxLength(50)
  name: string;

  @ApiPropertyOptional({ example: '#ff0000' })
  @IsOptional()
  @IsHexColor()
  @MaxLength(10)
  color?: string;
}
