import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MarketService } from './market.service';

@Injectable()
export class DefiService {
    private readonly logger = new Logger(DefiService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly marketService: MarketService
    ) { }

    @Cron(CronExpression.EVERY_10_MINUTES)
    async fetchOnChainData() {
        this.logger.log('Fetching on-chain DeFi & Volatility data...');

        // 1. Fetch real market prices
        const prices = await this.marketService.getLivePrices();
        const ethChange = Math.abs(prices.ethereum?.usd_24h_change || 0);

        // Derive volatility from 24h price change if DVOL not directly available
        const derivedVol = 50 + (ethChange * 2);

        await this.prisma.marketVolatility.create({
            data: {
                indexName: 'ETH-DVOL',
                value: derivedVol,
            }
        });

        // 2. Iterate through users with wallets and calculate risk
        const users = await this.prisma.user.findMany({
            where: { walletAddress: { not: null } }
        });

        for (const user of users) {
            // In a real app we'd fetch balance via RPC, 
            // here we simulate based on some known "whale" addresses or random
            const mockPortfolioValue = 10000 + (Math.random() * 5000);

            // Calculate Risk Score: (Volatility / 100) * (PortfolioSize Penalty)
            let riskScore = derivedVol / 100;
            if (mockPortfolioValue > 13000) riskScore += 0.15;

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
