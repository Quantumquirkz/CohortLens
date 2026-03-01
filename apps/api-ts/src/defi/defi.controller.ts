import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DefiService } from './defi.service';
import { MarketService } from './market.service';

@ApiTags('defi')
@Controller('/api/v2/defi')
export class DefiController {
    constructor(
        private readonly defiService: DefiService,
        private readonly marketService: MarketService
    ) { }

    @ApiOperation({ summary: 'Get latest calculated risk scores and market volatility' })
    @Get('risk')
    getRiskScores() {
        return this.defiService.getLatestRiskScores();
    }

    @ApiOperation({ summary: 'Get real-time market prices from CoinGecko' })
    @Get('market/prices')
    getMarketPrices() {
        return this.marketService.getLivePrices();
    }

    @ApiOperation({ summary: 'Get simulated whale movements (Live Alpha)' })
    @Get('market/whales')
    getWhaleAlerts() {
        return this.marketService.getWhaleAlerts();
    }

    @ApiOperation({ summary: 'Trigger a manual refresh of on-chain risk metrics' })
    @Post('refresh')
    triggerRefresh() {
        return this.defiService.triggerRiskRefresh();
    }

    @ApiOperation({ summary: 'Simulate a market event (BULL_RUN or FLASH_CRASH)' })
    @Post('simulate')
    simulateEvent(@Body() body: { type: 'FLASH_CRASH' | 'BULL_RUN' }) {
        return this.defiService.simulateMarketEvent(body.type);
    }
}
