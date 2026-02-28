import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class RecommendationDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  query!: string;
}
