import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NftService } from './nft.service';
import { AirdropNftDto } from './dto/airdrop-nft.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('nft-loyalty')
@Controller('/api/v2/nft')
export class NftController {
    constructor(private readonly nftService: NftService) { }

    @ApiOperation({ summary: 'Check current user NFT License Tier' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get('license')
    async getLicense(@Req() req: any) {
        return this.nftService.checkLicense(1); // Hardcoded ID 1 for mock
    }

    @ApiOperation({ summary: 'List all Loyalty NFTs airdropped to the user' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get('airdrops')
    async getAirdrops(@Req() req: any) {
        return this.nftService.getUserAirdrops(1); // Hardcoded ID 1 for mock
    }

    @ApiOperation({ summary: 'Trigger a Gasless Loyalty NFT Airdrop to a User' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Post('airdrop')
    async airdropNft(@Req() req: any, @Body() body: AirdropNftDto) {
        // Mocking admin ID 1
        return this.nftService.airdropLoyaltyNft(1, body.userId, body.campaignName);
    }
}
