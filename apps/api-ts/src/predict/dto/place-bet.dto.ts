import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsEnum, Min } from 'class-validator';

export class PlaceBetDto {
    @ApiProperty({ example: 1 })
    @IsNumber()
    marketId!: number;

    @ApiProperty({ example: 'YES', enum: ['YES', 'NO'] })
    @IsString()
    @IsEnum(['YES', 'NO'])
    prediction!: string;

    @ApiProperty({ example: 100 })
    @IsNumber()
    @Min(1)
    amount!: number;
}
