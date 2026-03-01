import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class ZkVerifyDto {
    @ApiProperty({ example: 'WHALE_STATUS' })
    @IsString()
    @IsNotEmpty()
    credentialType!: string;

    @ApiProperty({ example: '0xabc123...' })
    @IsString()
    @IsNotEmpty()
    proofHash!: string;
}
