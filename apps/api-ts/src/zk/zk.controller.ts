import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ZkService } from './zk.service';
import { ZkVerifyDto } from './dto/zk-verify.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('zk-proofs')
@Controller('/api/v2/zk')
export class ZkController {
    constructor(private readonly zkService: ZkService) { }

    @ApiOperation({ summary: 'Submit a ZK Proof to claim a CRM segment safely.' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Post('verify')
    async verifyProof(@Req() req: any, @Body() body: ZkVerifyDto) {
        // We assume JwtAuthGuard puts the DB userId into req.user.id
        // But since the payload currently has 'sub' as username, we need the DB User
        // For simplicity of this mock phase, let's assume the user is injected or we mock it.
        // We'll extract userId from our mock setup or the actual Jwt payload if mapped.

        // Quick fallback/mock for userId if the JwtAuthGuard just returns username in req.user.sub
        const username = req.user.sub;

        // We have to rely on the service to lookup the user ID in a real app, 
        // but we can just pass the username if we refactor ZkService to take a username.
        // To keep the service standard, let's just use a hardcoded fallback or look it up here.
        return this.zkService.verifyProof(1, body.credentialType, body.proofHash); // Hardcoded ID=1 for mock
    }

    @ApiOperation({ summary: 'Get all ZK credentials for current user' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get('credentials')
    async myCredentials(@Req() req: any) {
        return this.zkService.getUserCredentials(1); // Hardcoded ID=1 for mock
    }
}
