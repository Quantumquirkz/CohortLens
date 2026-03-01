import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProfileService {
    constructor(private readonly prisma: PrismaService) { }

    async getProfileByAddress(walletAddress: string) {
        const user = await this.prisma.user.findUnique({
            where: { walletAddress },
            include: {
                nftLicenses: true,
                zkCredentials: true,
                defiPortfolios: {
                    orderBy: { lastUpdated: 'desc' },
                    take: 1,
                },
                marketBets: true,
                loyaltyAirdrops: true,
            }
        });

        if (!user) {
            throw new NotFoundException('Profile not found');
        }

        const latestPortfolio = user.defiPortfolios[0];

        // Calculate Win Rate
        const totalBets = user.marketBets.length;
        // This is a mock win rate calculation since we don't have market resolution here 
        // In a real app we'd join with PredictionMarket.status
        const winRate = totalBets > 0 ? '58%' : '0%';

        return {
            wallet: user.walletAddress,
            memberSince: user.createdAt,
            tier: user.nftLicenses[0]?.tier || 'BASIC',
            tokenId: user.nftLicenses[0]?.tokenId || null,
            riskScore: latestPortfolio?.riskScore || 0,
            portfolioValueUsd: latestPortfolio?.totalValueUsd || 0,
            credentials: user.zkCredentials.map(c => ({
                credentialType: c.credentialType,
                verifiedAt: c.verifiedAt
            })),
            betsPlaced: totalBets,
            winRate: winRate,
            airdropsReceived: user.loyaltyAirdrops.length
        };
    }
}
