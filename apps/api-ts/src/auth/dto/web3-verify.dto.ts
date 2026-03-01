import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class Web3VerifyDto {
    @ApiProperty({ example: '0x123...' })
    @IsString()
    @IsNotEmpty()
    message!: string;

    @ApiProperty({ example: '0xabc...' })
    @IsString()
    @IsNotEmpty()
    signature!: string;
}
