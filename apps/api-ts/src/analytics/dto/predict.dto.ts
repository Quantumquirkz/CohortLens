import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class PredictDto {
  @ApiProperty()
  @IsInt()
  @Min(18)
  @Max(100)
  age!: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  annual_income!: number;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(80)
  work_experience!: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(20)
  family_size!: number;

  @ApiProperty({ required: false, default: 'Other' })
  @IsOptional()
  @IsString()
  profession?: string;
}
