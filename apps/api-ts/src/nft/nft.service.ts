import { Injectable, Logger, OnModuleInit, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NftService implements OnModuleInit {
    private readonly logger = new Logger(NftService.name);

    constructor(private readonly prisma: PrismaService) { }

    async onModuleInit() {
        // Seed a mock Pro NFT License for the test user (user ID 1) if it doesn't exist
        const licenseCount = await this.prisma.nftLicense.count();
        if (licenseCount === 0) {
            this.logger.log('Seeding initial PRO NFT License for mock user...');
            const user = await this.prisma.user.findFirst();
            if (user) {
                await this.prisma.nftLicense.create({
                    data: {
                        userId: user.id,
                        tier: 'PRO',
                        tokenId: '0xabc123456789def_PRO', // Mock Token ID
                    }
                });
            }
        }
    }

    async checkLicense(userId: number) {
        const license = await this.prisma.nftLicense.findUnique({
            where: { userId }
        });

        if (!license) {
            return { hasLicense: false, tier: 'NONE' };
        }

        return {
            hasLicense: true,
            tier: license.tier,
            tokenId: license.tokenId,
            mintedAt: license.mintedAt
        };
    }

    async airdropLoyaltyNft(adminUserId: number, targetUserId: number, campaignName: string) {
        this.logger.log(`Admin ${adminUserId} triggering gasless airdrop to User ${targetUserId} for ${campaignName}`);

        // Mock Blockchain Transaction Delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        const targetUser = await this.prisma.user.findUnique({ where: { id: targetUserId } });
        if (!targetUser) throw new NotFoundException('Target user not found');

        const tokenId = `0xLOYALTY_${Math.random().toString(16).slice(2, 10).toUpperCase()}`;

        const airdrop = await this.prisma.loyaltyAirdrop.create({
            data: {
                userId: targetUserId,
                campaignName,
                tokenId
            }
        });

        return {
            success: true,
            message: `Successfully airdropped Loyalty NFT to User ${targetUserId}`,
            airdrop
        };
    }

    async getUserAirdrops(userId: number) {
        return this.prisma.loyaltyAirdrop.findMany({
            where: { userId },
            orderBy: { claimedAt: 'desc' }
        });
    }
}
