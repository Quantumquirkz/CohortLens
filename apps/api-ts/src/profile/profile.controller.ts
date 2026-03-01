import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BaseController } from '../common/base.controller';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('profile')
@Controller('/api/v2/profile')
export class ProfileController extends BaseController {
    constructor(
        private readonly profileService: ProfileService,
        protected readonly prisma: PrismaService
    ) {
        super(prisma);
    }

    @ApiOperation({ summary: 'Get public reputation profile by wallet address' })
    @Get(':address')
    async getPublicProfile(@Param('address') address: string) {
        return this.profileService.getProfileByAddress(address);
    }

    @ApiOperation({ summary: 'Get reputation profile for the authenticated user' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Get('me')
    async getMyProfile(@Req() req: any) {
        const identifier = req.user.sub;

        // We can just use the address from JWT
        // but if it's a username we need to find the address
        const user = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { walletAddress: identifier },
                    { username: identifier }
                ]
            }
        });

        if (!user || !user.walletAddress) {
            return this.profileService.getProfileByAddress(identifier); // Fallback
        }

        return this.profileService.getProfileByAddress(user.walletAddress);
    }
}
