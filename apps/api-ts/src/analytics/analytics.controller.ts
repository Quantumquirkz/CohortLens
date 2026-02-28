import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';
import { PredictDto } from './dto/predict.dto';
import { RecommendationDto } from './dto/recommendation.dto';

type AuthRequest = ExpressRequest & { user: { sub: string; tenant_id?: string } };

@ApiTags('analytics')
@Controller('/api/v2')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('/health')
  health() {
    return this.analyticsService.health();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('/usage')
  usage(@Request() req: AuthRequest) {
    const tenantId = req.user?.tenant_id || req.user?.sub || 'anonymous';
    return this.analyticsService.usage(tenantId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('/predict-spending')
  predict(@Request() req: AuthRequest, @Body() body: PredictDto) {
    const tenantId = req.user?.tenant_id || req.user?.sub || 'anonymous';
    return this.analyticsService.predict(tenantId, body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('/segment')
  segment(
    @Request() req: AuthRequest,
    @Body() body: Array<{ CustomerID?: string; Age: number; 'Annual Income ($)': number; 'Spending Score (1-100)': number }>,
  ) {
    const tenantId = req.user?.tenant_id || req.user?.sub || 'anonymous';
    return this.analyticsService.segment(tenantId, body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('/recommendations/natural')
  recommendations(@Request() req: AuthRequest, @Body() body: RecommendationDto) {
    const tenantId = req.user?.tenant_id || req.user?.sub || 'anonymous';
    return this.analyticsService.recommendations(tenantId, body.query);
  }
}
