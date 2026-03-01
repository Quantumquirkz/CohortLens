import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { NftService } from './nft.service';
import { AirdropNftDto } from './dto/airdrop-nft.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BaseController } from '../common/base.controller';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('nft-loyalty')
@Controller('/api/v2/nft')
export class NftController extends BaseController {
    constructor(
        private readonly nftService: NftService,
        protected readonly prisma: PrismaService
    ) {
        super(prisma);
    }

    @ApiOperation({ summary: 'Check current user NFT License Tier' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get('license')
    async getLicense(@Req() req: any) {
        const userId = await this.getUserIdFromRequest(req);
        return this.nftService.checkLicense(userId);
    }

    @ApiOperation({ summary: 'List all Loyalty NFTs airdropped to the user' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get('airdrops')
    async getAirdrops(@Req() req: any) {
        const userId = await this.getUserIdFromRequest(req);
        return this.nftService.getUserAirdrops(userId);
    }

    @ApiOperation({ summary: 'Trigger a Gasless Loyalty NFT Airdrop to a User' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Post('airdrop')
    async airdropNft(@Req() req: any, @Body() body: AirdropNftDto) {
        const adminUserId = await this.getUserIdFromRequest(req);
        return this.nftService.airdropLoyaltyNft(adminUserId, body.userId, body.campaignName);
    }
}
