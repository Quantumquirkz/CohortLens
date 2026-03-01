"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
let AnalyticsService = class AnalyticsService {
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
        this.serviceName = 'cohortlens';
        this.apiVersion = '2.0.0';
        this.ruleVersion = 'rules-v1';
    }
    monthKey() {
        const now = new Date();
        return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    }
    async ensureUsageLimit(tenantId) {
        const monthKey = this.monthKey();
        const defaultLimit = Number(this.config.get('API_USAGE_LIMIT', '1000'));
        const subscription = await this.prisma.subscription.findFirst({
            where: { tenantId, OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] },
            orderBy: { createdAt: 'desc' },
        });
        let limit = defaultLimit;
        if (subscription?.limits) {
            try {
                const parsed = JSON.parse(subscription.limits);
                if (parsed.max_api_calls_per_month && Number.isFinite(parsed.max_api_calls_per_month)) {
                    limit = parsed.max_api_calls_per_month;
                }
            }
            catch {
            }
        }
        const usage = await this.prisma.apiUsage.upsert({
            where: {
                tenantId_monthKey: {
                    tenantId,
                    monthKey,
                },
            },
            create: {
                tenantId,
                monthKey,
                callCount: 0,
            },
            update: {},
        });
        if (usage.callCount >= limit) {
            throw new common_1.HttpException('Plan limit exceeded', common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        await this.prisma.apiUsage.update({
            where: { id: usage.id },
            data: { callCount: { increment: 1 }, lastCalled: new Date() },
        });
        return { monthKey, limit, current: usage.callCount + 1 };
    }
    async health() {
        let neonStatus = 'not_configured';
        if (process.env.NEON_DATABASE_URL) {
            try {
                await this.prisma.$queryRaw `SELECT 1`;
                neonStatus = 'connected';
            }
            catch {
                neonStatus = 'error';
            }
        }
        return {
            status: 'ok',
            service: this.serviceName,
            version: this.apiVersion,
            neon_db: neonStatus,
            timestamp: new Date().toISOString(),
        };
    }
    async usage(tenantId) {
        if (process.env.SKIP_DB === 'true') {
            return {
                tenant_id: tenantId,
                month_key: this.monthKey(),
                current_month_calls: Math.floor(Math.random() * 500),
                limit: 1000,
            };
        }
        const monthKey = this.monthKey();
        const usage = await this.prisma.apiUsage.findUnique({
            where: {
                tenantId_monthKey: {
                    tenantId,
                    monthKey,
                },
            },
        });
        const limit = Number(this.config.get('API_USAGE_LIMIT', '1000'));
        return {
            tenant_id: tenantId,
            month_key: monthKey,
            current_month_calls: usage?.callCount ?? 0,
            limit,
        };
    }
    async getCustomers() {
        return this.prisma.customer.findMany({
            orderBy: { id: 'desc' },
        });
    }
    confidenceFromScore(score) {
        if (score >= 75)
            return 'high';
        if (score >= 40)
            return 'medium';
        return 'low';
    }
    async predict(tenantId, input) {
        if (process.env.SKIP_DB === 'true') {
            const mockScore = Math.floor(Math.random() * 100);
            return {
                predicted_spending: mockScore,
                confidence: this.confidenceFromScore(mockScore),
                rule_version: this.ruleVersion,
            };
        }
        await this.ensureUsageLimit(tenantId);
        const latestVol = await this.prisma.marketVolatility.findFirst({
            orderBy: { timestamp: 'desc' }
        });
        const incomeNormalized = Math.min(1, Math.max(0, input.annual_income / 200000));
        const ageSweetSpot = 1 - Math.min(1, Math.abs(input.age - 38) / 40);
        const expNormalized = Math.min(1, input.work_experience / 30);
        const familyPenalty = Math.min(1, (input.family_size - 1) / 8);
        const professionBoost = ['engineer', 'doctor', 'manager', 'consultant'].includes((input.profession || '').toLowerCase())
            ? 0.08
            : 0;
        const raw = incomeNormalized * 52 +
            ageSweetSpot * 18 +
            expNormalized * 20 -
            familyPenalty * 10 +
            professionBoost * 100;
        const bounded = Math.max(0, Math.min(100, raw));
        const predicted = Number(bounded.toFixed(1));
        const volMetric = latestVol?.value || 50;
        let confidence = this.confidenceFromScore(predicted);
        if (volMetric > 75 && confidence === 'high')
            confidence = 'medium';
        if (volMetric > 90)
            confidence = 'low';
        await this.prisma.prediction.create({
            data: {
                customerId: `api_${tenantId}`,
                predictedSpending: predicted,
                modelVersion: this.ruleVersion,
                featuresSnapshot: JSON.stringify(input),
            },
        });
        await this.prisma.auditLog.create({
            data: {
                tableName: 'predictions',
                recordId: `api_${tenantId}`,
                action: 'INSERT',
                newValues: JSON.stringify({ predicted_spending: predicted, confidence, model_version: this.ruleVersion }),
                userId: tenantId,
            },
        });
        return {
            predicted_spending: predicted,
            confidence,
            rule_version: this.ruleVersion,
        };
    }
    async getDefiRiskForWallet(walletAddress) {
        if (!walletAddress)
            return null;
        return this.prisma.deFiPortfolio.findFirst({
            where: { walletAddress },
            orderBy: { lastUpdated: 'desc' },
        });
    }
    clusterFromInput(row, defiRiskScore) {
        const age = row.Age;
        const income = row['Annual Income ($)'];
        const spending = row['Spending Score (1-100)'];
        if (spending >= 80 && defiRiskScore && defiRiskScore > 0.7)
            return 6;
        if (income >= 90000 && spending >= 70)
            return 0;
        if (income >= 90000 && spending < 70)
            return 1;
        if (income < 50000 && spending >= 60)
            return 2;
        if (age <= 28 && spending >= 50)
            return 3;
        if (age >= 50 && spending < 45)
            return 4;
        return 5;
    }
    async segment(tenantId, rows) {
        if (process.env.SKIP_DB === 'true') {
            return {
                clusters: rows.map(() => Math.floor(Math.random() * 6)),
                rule_version: this.ruleVersion,
            };
        }
        await this.ensureUsageLimit(tenantId);
        const customerIds = rows.map(r => r.CustomerID).filter(Boolean);
        const customersWithWallets = await this.prisma.customer.findMany({
            where: { customerId: { in: customerIds }, walletAddress: { not: null } },
            select: { customerId: true, walletAddress: true }
        });
        const walletMap = new Map(customersWithWallets.map(c => [c.customerId, c.walletAddress]));
        const wallets = customersWithWallets.map(c => c.walletAddress).filter(Boolean);
        const portfolios = await this.prisma.deFiPortfolio.findMany({
            where: { walletAddress: { in: wallets } },
            orderBy: { lastUpdated: 'desc' }
        });
        const riskMap = new Map(portfolios.map(p => [p.walletAddress, p.riskScore]));
        const clusters = rows.map((row) => {
            const wallet = row.CustomerID ? walletMap.get(row.CustomerID) : undefined;
            const riskScore = wallet ? riskMap.get(wallet) : undefined;
            return this.clusterFromInput(row, riskScore);
        });
        const inserts = rows
            .map((row, index) => ({
            customerId: row.CustomerID || `api_${tenantId}_${index}`,
            cluster: clusters[index],
            modelVersion: this.ruleVersion,
        }))
            .slice(0, 5000);
        if (inserts.length) {
            await this.prisma.segment.createMany({ data: inserts });
            await this.prisma.auditLog.create({
                data: {
                    tableName: 'segments',
                    recordId: `batch_${Date.now()}`,
                    action: 'INSERT',
                    newValues: JSON.stringify({ count: inserts.length, model_version: this.ruleVersion }),
                    userId: tenantId,
                },
            });
        }
        return {
            clusters,
            rule_version: this.ruleVersion,
        };
    }
    summarizeSegments(rows, clusters) {
        const bucket = new Map();
        clusters.forEach((cluster, idx) => {
            const prev = bucket.get(cluster) || { count: 0, avgIncome: 0, avgSpending: 0 };
            const income = rows[idx]['Annual Income ($)'];
            const spending = rows[idx]['Spending Score (1-100)'];
            const count = prev.count + 1;
            bucket.set(cluster, {
                count,
                avgIncome: (prev.avgIncome * prev.count + income) / count,
                avgSpending: (prev.avgSpending * prev.count + spending) / count,
            });
        });
        return Array.from(bucket.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([cluster, val]) => `C${cluster}: n=${val.count}, income=${val.avgIncome.toFixed(0)}, spend=${val.avgSpending.toFixed(1)}`)
            .join(' | ');
    }
    async recommendations(tenantId, query) {
        if (process.env.SKIP_DB === 'true') {
            return {
                recommendation: 'Rule-based recommendation: prioritize high-value segments for engagement',
                source: 'rule_based',
            };
        }
        await this.ensureUsageLimit(tenantId);
        const rows = await this.prisma.customer.findMany({
            where: { deletedAt: null },
            take: 500,
            select: {
                customerId: true,
                age: true,
                annualIncome: true,
                spendingScore: true,
                walletAddress: true,
            },
        });
        const latestVol = await this.prisma.marketVolatility.findFirst({
            orderBy: { timestamp: 'desc' }
        });
        const normalized = rows.map((r) => ({
            CustomerID: r.customerId,
            Age: r.age ?? 30,
            'Annual Income ($)': Number(r.annualIncome),
            'Spending Score (1-100)': r.spendingScore ?? 50,
        }));
        const wallets = rows.map(r => r.walletAddress).filter(Boolean);
        const portfolios = await this.prisma.deFiPortfolio.findMany({
            where: { walletAddress: { in: wallets } },
            orderBy: { lastUpdated: 'desc' }
        });
        const riskMap = new Map(portfolios.map(p => [p.walletAddress, p.riskScore]));
        const clusters = rows.map((r, i) => {
            const riskScore = r.walletAddress ? riskMap.get(r.walletAddress) : undefined;
            return this.clusterFromInput(normalized[i], riskScore);
        });
        const segmentSummary = this.summarizeSegments(normalized, clusters);
        const context = `Market Volatility (DVOL): ${latestVol?.value.toFixed(1) || 'Unknown'}. Segments: ${segmentSummary}`;
        const groqApiKey = this.config.get('GROQ_API_KEY', '');
        const model = this.config.get('GROQ_MODEL', 'llama-3.3-70b-versatile');
        if (!groqApiKey) {
            return {
                recommendation: `Rule-based recommendation: prioritize C0/C2 for upsell, C1 for retention, C4 for reactivation. Context: ${context}`,
                source: 'rule_based',
            };
        }
        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${groqApiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a CRM analytics assistant. Provide concise, actionable recommendations based on segment context.',
                        },
                        { role: 'user', content: `Question: ${query}\nContext: ${context}` },
                    ],
                    temperature: 0.3,
                    max_tokens: 180,
                }),
            });
            if (!response.ok) {
                throw new Error(`Groq HTTP ${response.status}`);
            }
            const json = (await response.json());
            const content = json.choices?.[0]?.message?.content?.trim();
            if (!content) {
                throw new Error('Empty response from Groq');
            }
            return { recommendation: content, source: 'groq' };
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            throw new common_1.InternalServerErrorException(`Failed to generate recommendation: ${msg}`);
        }
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map