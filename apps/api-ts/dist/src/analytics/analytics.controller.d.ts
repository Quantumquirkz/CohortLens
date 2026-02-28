import type { Request as ExpressRequest } from 'express';
import { AnalyticsService } from './analytics.service';
import { PredictDto } from './dto/predict.dto';
import { RecommendationDto } from './dto/recommendation.dto';
type AuthRequest = ExpressRequest & {
    user: {
        sub: string;
        tenant_id?: string;
    };
};
export declare class AnalyticsController {
    private readonly analyticsService;
    constructor(analyticsService: AnalyticsService);
    health(): Promise<{
        status: string;
        service: string;
        version: string;
        neon_db: string;
        timestamp: string;
    }>;
    usage(req: AuthRequest): Promise<{
        tenant_id: string;
        month_key: string;
        current_month_calls: number;
        limit: number;
    }>;
    predict(req: AuthRequest, body: PredictDto): Promise<{
        predicted_spending: number;
        confidence: "low" | "medium" | "high";
        rule_version: string;
    }>;
    segment(req: AuthRequest, body: Array<{
        CustomerID?: string;
        Age: number;
        'Annual Income ($)': number;
        'Spending Score (1-100)': number;
    }>): Promise<{
        clusters: number[];
        rule_version: string;
    }>;
    recommendations(req: AuthRequest, body: RecommendationDto): Promise<{
        recommendation: string;
        source: "rule_based";
    } | {
        recommendation: string;
        source: "groq";
    }>;
}
export {};
