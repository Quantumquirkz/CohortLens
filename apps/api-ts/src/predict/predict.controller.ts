import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PredictService } from './predict.service';
import { PlaceBetDto } from './dto/place-bet.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('predict-markets')
@Controller('/api/v2/predict')
export class PredictController {
    constructor(private readonly predictService: PredictService) { }

    @ApiOperation({ summary: 'Get all active Campaign Prediction Markets' })
    @Get('markets')
    async getMarkets() {
        return this.predictService.getActiveMarkets();
    }

    @ApiOperation({ summary: 'Place a simulated bet on a CRM Campaign Outcome' })
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Post('bet')
    async placeBet(@Req() req: any, @Body() body: PlaceBetDto) {
        // Mocking User ID as 1 for simulation. Normally req.user.id
        return this.predictService.placeBet(1, body.marketId, body.prediction, body.amount);
    }
}
