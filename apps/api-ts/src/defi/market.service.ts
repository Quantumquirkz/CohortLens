import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import fetch from 'node-fetch';

@Injectable()
export class MarketService {
    private readonly logger = new Logger(MarketService.name);
    private cache: { prices: any; timestamp: number } | null = null;
    private readonly CACHE_TTL = 60000; // 1 minute

    constructor(private config: ConfigService) { }

    async getLivePrices() {
        const now = Date.now();
        if (this.cache && now - this.cache.timestamp < this.CACHE_TTL) {
            return this.cache.prices;
        }

        try {
            this.logger.log('Fetching live prices from CoinGecko...');
            const response = await fetch(
                'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin,solana,polygon-ecosystem-coin&vs_currencies=usd&include_24hr_change=true'
            );

            if (!response.ok) {
                throw new Error(`CoinGecko API error: ${response.statusText}`);
            }

            const data = await response.json();
            this.cache = {
                prices: data,
                timestamp: now,
            };

            return data;
        } catch (error: any) {
            this.logger.error(`Failed to fetch market data: ${error.message}`);
            // Return cached data if available even if expired, or a fallback
            return this.cache?.prices || {
                ethereum: { usd: 3000, usd_24h_change: 0 },
                bitcoin: { usd: 60000, usd_24h_change: 0 },
                solana: { usd: 100, usd_24h_change: 0 }
            };
        }
    }

    async getWhaleAlerts() {
        // Simulated Whale Alerts (Live Alpha)
        return [
            {
                id: 'w1',
                type: 'TRANSFER',
                asset: 'ETH',
                amount: '4,500',
                usdValue: '13.5M',
                timestamp: new Date().toISOString(),
                from: 'Unknown Whale',
                to: 'Coinbase',
                riskImpact: 'HIGH'
            },
            {
                id: 'w2',
                type: 'MINT',
                asset: 'USDC',
                amount: '50,000,000',
                usdValue: '50M',
                timestamp: new Date(Date.now() - 300000).toISOString(),
                from: 'Circle Treasury',
                to: 'Mercado',
                riskImpact: 'LOW'
            },
            {
                id: 'w3',
                type: 'BURN',
                asset: 'POL',
                amount: '1,200,000',
                usdValue: '850k',
                timestamp: new Date(Date.now() - 900000).toISOString(),
                from: 'Polygon Bridge',
                to: 'Burn Address',
                riskImpact: 'MEDIUM'
            }
        ];
    }
}
