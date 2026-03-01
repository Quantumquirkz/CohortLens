import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ZkService } from './zk.service';
import { ZkVerifyDto } from './dto/zk-verify.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BaseController } from '../common/base.controller';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('zk-proofs')
@Controller('/api/v2/zk')
export class ZkController extends BaseController {
    constructor(
        private readonly zkService: ZkService,
        protected readonly prisma: PrismaService
    ) {
        super(prisma);
    }

    @ApiOperation({ summary: 'Submit a ZK Proof to claim a CRM segment safely.' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Post('verify')
    async verifyProof(@Req() req: any, @Body() body: ZkVerifyDto) {
        const userId = await this.getUserIdFromRequest(req);
        return this.zkService.verifyProof(userId, body.credentialType, body.proofHash);
    }

    @ApiOperation({ summary: 'Get all ZK credentials for current user' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get('credentials')
    async myCredentials(@Req() req: any) {
        const userId = await this.getUserIdFromRequest(req);
        return this.zkService.getUserCredentials(userId);
    }
}
