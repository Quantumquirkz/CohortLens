import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsNotEmpty } from 'class-validator';

export class AirdropNftDto {
    @ApiProperty({ example: 1 })
    @IsNumber()
    userId!: number;

    @ApiProperty({ example: 'Summer Launch Campaign' })
    @IsString()
    @IsNotEmpty()
    campaignName!: string;
}
