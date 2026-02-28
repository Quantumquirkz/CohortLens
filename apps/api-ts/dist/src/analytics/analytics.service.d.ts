import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PredictDto } from './dto/predict.dto';
type SegmentInput = {
    CustomerID?: string;
    Age: number;
    'Annual Income ($)': number;
    'Spending Score (1-100)': number;
};
export declare class AnalyticsService {
    private readonly prisma;
    private readonly config;
    private readonly serviceName;
    private readonly apiVersion;
    private readonly ruleVersion;
    constructor(prisma: PrismaService, config: ConfigService);
    private monthKey;
    private ensureUsageLimit;
    health(): Promise<{
        status: string;
        service: string;
        version: string;
        neon_db: string;
        timestamp: string;
    }>;
    usage(tenantId: string): Promise<{
        tenant_id: string;
        month_key: string;
        current_month_calls: any;
        limit: number;
    }>;
    private confidenceFromScore;
    predict(tenantId: string, input: PredictDto): Promise<{
        predicted_spending: number;
        confidence: "low" | "medium" | "high";
        rule_version: string;
    }>;
    private clusterFromInput;
    segment(tenantId: string, rows: SegmentInput[]): Promise<{
        clusters: number[];
        rule_version: string;
    }>;
    private summarizeSegments;
    recommendations(tenantId: string, query: string): Promise<{
        recommendation: string;
        source: "rule_based";
    } | {
        recommendation: string;
        source: "groq";
    }>;
}
export {};
