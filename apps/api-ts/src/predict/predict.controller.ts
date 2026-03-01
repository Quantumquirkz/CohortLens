import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PredictService } from './predict.service';
import { PlaceBetDto } from './dto/place-bet.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BaseController } from '../common/base.controller';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('predict-markets')
@Controller('/api/v2/predict')
export class PredictController extends BaseController {
    constructor(
        private readonly predictService: PredictService,
        protected readonly prisma: PrismaService
    ) {
        super(prisma);
    }

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
        const userId = await this.getUserIdFromRequest(req);
        return this.predictService.placeBet(userId, body.marketId, body.prediction, body.amount);
    }
}
