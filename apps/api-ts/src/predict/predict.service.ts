import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PredictService {
    private readonly logger = new Logger(PredictService.name);

    constructor(private readonly prisma: PrismaService) { }

    async getActiveMarkets() {
        // Return all open markets and calculate probabilities on the fly
        const markets = await this.prisma.predictionMarket.findMany({
            where: { status: 'OPEN' },
            orderBy: { createdAt: 'desc' }
        });

        return markets.map(m => {
            const total = m.totalYesPool + m.totalNoPool;
            // Default to 50/50 if pure zero liquidity
            const yesProb = total === 0 ? 0.5 : m.totalYesPool / total;

            return {
                ...m,
                yesProbability: yesProb,
                noProbability: 1 - yesProb,
            };
        });
    }

    async placeBet(userId: number, marketId: number, prediction: string, amount: number) {
        this.logger.log(`User ${userId} placing ${amount} on ${prediction} for Market ${marketId}`);

        // Simulate DB transaction
        return this.prisma.$transaction(async (tx) => {
            const market = await tx.predictionMarket.findUnique({ where: { id: marketId } });

            if (!market) throw new NotFoundException('Market not found');
            if (market.status !== 'OPEN') throw new BadRequestException('Market is already closed/resolved');

            // Update AMM Pools
            if (prediction === 'YES') {
                await tx.predictionMarket.update({
                    where: { id: marketId },
                    data: { totalYesPool: { increment: amount } }
                });
            } else {
                await tx.predictionMarket.update({
                    where: { id: marketId },
                    data: { totalNoPool: { increment: amount } }
                });
            }

            // Record the Bet
            const bet = await tx.marketBet.create({
                data: {
                    marketId,
                    userId,
                    prediction,
                    amount
                }
            });

            return {
                success: true,
                message: `Successfully placed $${amount} on ${prediction}`,
                bet
            };
        });
    }
}
