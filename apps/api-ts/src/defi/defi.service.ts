import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DefiService {
    private readonly logger = new Logger(DefiService.name);

    constructor(private readonly prisma: PrismaService) { }

    @Cron(CronExpression.EVERY_10_MINUTES)
    async fetchOnChainData() {
        this.logger.log('Fetching on-chain DeFi & Volatility data...');

        // 1. Mock Fetch Volatility (e.g. DVOL)
        const mockDvolIndex = 65.5 + (Math.random() * 10 - 5);

        await this.prisma.marketVolatility.create({
            data: {
                indexName: 'ETH-DVOL',
                value: mockDvolIndex,
            }
        });

        // 2. Iterate through users with wallets and calculate risk
        const users = await this.prisma.user.findMany({
            where: { walletAddress: { not: null } }
        });

        for (const user of users) {
            // Mock portfolio value calculation via RPC
            const mockPortfolioValue = 10000 + (Math.random() * 5000);

            // Calculate Risk Score: (Volatility / 100) * (PortfolioSize Penalty)
            // Higher numbers = Higher Risk of Liquidations/Churn
            let riskScore = mockDvolIndex / 100;
            if (mockPortfolioValue > 12000) riskScore += 0.2; // Whales have more complex risk profiles

            await this.prisma.deFiPortfolio.create({
                data: {
                    userId: user.id,
                    walletAddress: user.walletAddress!,
                    totalValueUsd: mockPortfolioValue,
                    riskScore: Math.min(riskScore, 1.0)
                }
            });
        }

        this.logger.log(`Updated DeFi portfolios and risk scores for ${users.length} users.`);
    }

    async getLatestRiskScores() {
        const latestVolatility = await this.prisma.marketVolatility.findFirst({
            orderBy: { timestamp: 'desc' }
        });

        const portfolios = await this.prisma.deFiPortfolio.findMany({
            orderBy: { lastUpdated: 'desc' },
            take: 50,
            include: {
                user: { select: { walletAddress: true, username: true } },
            }
        });

        return {
            marketVolatility: latestVolatility,
            userPortfolios: portfolios,
        };
    }

    async triggerRiskRefresh() {
        this.logger.log('Manual risk refresh triggered via API...');
        await this.fetchOnChainData();
        return { success: true, message: 'On-chain risk metrics updated.' };
    }

    async simulateMarketEvent(type: 'FLASH_CRASH' | 'BULL_RUN') {
        this.logger.log(`SIMULATING MARKET EVENT: ${type}`);

        let targetVol = type === 'FLASH_CRASH' ? 95.0 : 35.0;
        targetVol += (Math.random() * 4 - 2); // Add slight variance

        await this.prisma.marketVolatility.create({
            data: {
                indexName: 'ETH-DVOL-SIM',
                value: targetVol,
            }
        });

        // Force refresh portfolios with extreme risk if crash
        const users = await this.prisma.user.findMany({ where: { walletAddress: { not: null } } });
        for (const user of users) {
            const riskValue = type === 'FLASH_CRASH' ? 0.9 + (Math.random() * 0.1) : 0.2 + (Math.random() * 0.1);
            await this.prisma.deFiPortfolio.create({
                data: {
                    userId: user.id,
                    walletAddress: user.walletAddress!,
                    totalValueUsd: 15000,
                    riskScore: Math.min(riskValue, 1.0)
                }
            });
        }

        return { success: true, message: `Market ${type.replace('_', ' ')} simulation active.`, newVolatility: targetVol };
    }
}
