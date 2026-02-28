"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const common_1 = require("@nestjs/common");
const request = require("supertest");
const app_module_1 = require("../../src/app.module");
describe('Analytics Endpoints (e2e)', () => {
    let app;
    let accessToken;
    beforeAll(async () => {
        const moduleFixture = await testing_1.Test.createTestingModule({
            imports: [app_module_1.AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, transform: true }));
        await app.init();
        const authRes = await request(app.getHttpServer())
            .post('/api/v2/auth/token')
            .send({ username: 'admin', password: 'admin' });
        accessToken = authRes.body.access_token;
    });
    afterAll(async () => {
        await app.close();
    });
    describe('GET /api/v2/usage', () => {
        it('should require authentication', () => {
            return request(app.getHttpServer())
                .get('/api/v2/usage')
                .expect(401);
        });
        it('should return usage stats with valid token', () => {
            return request(app.getHttpServer())
                .get('/api/v2/usage')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200)
                .expect((res) => {
                expect(res.body).toHaveProperty('tenant_id');
                expect(res.body).toHaveProperty('month_key');
                expect(res.body).toHaveProperty('current_month_calls');
                expect(res.body).toHaveProperty('limit');
                expect(res.body.current_month_calls >= 0).toBe(true);
                expect(res.body.limit > 0).toBe(true);
            });
        });
    });
    describe('POST /api/v2/predict-spending', () => {
        it('should require authentication', () => {
            return request(app.getHttpServer())
                .post('/api/v2/predict-spending')
                .send({ age: 35, annual_income: 75000, work_experience: 10, family_size: 3 })
                .expect(401);
        });
        it('should predict spending for valid input', () => {
            return request(app.getHttpServer())
                .post('/api/v2/predict-spending')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                age: 35,
                annual_income: 75000,
                work_experience: 10,
                family_size: 3,
                profession: 'Engineer',
            })
                .expect(201)
                .expect((res) => {
                expect(res.body).toHaveProperty('predicted_spending');
                expect(typeof res.body.predicted_spending).toBe('number');
                expect(res.body.predicted_spending >= 0 && res.body.predicted_spending <= 100).toBe(true);
                expect(res.body).toHaveProperty('confidence');
                expect(['low', 'medium', 'high']).toContain(res.body.confidence);
                expect(res.body).toHaveProperty('rule_version');
            });
        });
        it('should handle boundary age values', () => {
            return request(app.getHttpServer())
                .post('/api/v2/predict-spending')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                age: 18,
                annual_income: 30000,
                work_experience: 0,
                family_size: 1,
            })
                .expect(201);
        });
        it('should reject age < 18', () => {
            return request(app.getHttpServer())
                .post('/api/v2/predict-spending')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                age: 17,
                annual_income: 50000,
                work_experience: 0,
                family_size: 1,
            })
                .expect(400);
        });
        it('should reject age > 100', () => {
            return request(app.getHttpServer())
                .post('/api/v2/predict-spending')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                age: 101,
                annual_income: 50000,
                work_experience: 10,
                family_size: 1,
            })
                .expect(400);
        });
        it('should reject non-positive income', () => {
            return request(app.getHttpServer())
                .post('/api/v2/predict-spending')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                age: 35,
                annual_income: 0,
                work_experience: 10,
                family_size: 3,
            })
                .expect(400);
        });
        it('should reject negative work_experience', () => {
            return request(app.getHttpServer())
                .post('/api/v2/predict-spending')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                age: 35,
                annual_income: 50000,
                work_experience: -1,
                family_size: 1,
            })
                .expect(400);
        });
        it('should reject family_size < 1', () => {
            return request(app.getHttpServer())
                .post('/api/v2/predict-spending')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({
                age: 35,
                annual_income: 50000,
                work_experience: 10,
                family_size: 0,
            })
                .expect(400);
        });
    });
    describe('POST /api/v2/segment', () => {
        it('should require authentication', () => {
            return request(app.getHttpServer())
                .post('/api/v2/segment')
                .send([
                {
                    Age: 25,
                    'Annual Income ($)': 50000,
                    'Spending Score (1-100)': 60,
                },
            ])
                .expect(401);
        });
        it('should segment single customer', () => {
            return request(app.getHttpServer())
                .post('/api/v2/segment')
                .set('Authorization', `Bearer ${accessToken}`)
                .send([
                {
                    CustomerID: 'c1',
                    Age: 25,
                    'Annual Income ($)': 50000,
                    'Spending Score (1-100)': 60,
                },
            ])
                .expect(201)
                .expect((res) => {
                expect(res.body).toHaveProperty('clusters');
                expect(Array.isArray(res.body.clusters)).toBe(true);
                expect(res.body.clusters.length).toBe(1);
                expect(res.body.clusters[0] >= 0 && res.body.clusters[0] <= 5).toBe(true);
                expect(res.body).toHaveProperty('rule_version');
            });
        });
        it('should batch segment multiple customers up to 10k', () => {
            const batch = Array.from({ length: 100 }, (_, i) => ({
                CustomerID: `c${i}`,
                Age: 20 + (i % 60),
                'Annual Income ($)': 30000 + (i * 1000),
                'Spending Score (1-100)': (i % 100),
            }));
            return request(app.getHttpServer())
                .post('/api/v2/segment')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(batch)
                .expect(201)
                .expect((res) => {
                expect(res.body.clusters.length).toBe(100);
                expect(res.body.clusters.every((c) => c >= 0 && c <= 5)).toBe(true);
            });
        });
        it('should reject empty batch', () => {
            return request(app.getHttpServer())
                .post('/api/v2/segment')
                .set('Authorization', `Bearer ${accessToken}`)
                .send([])
                .expect(400);
        });
        it('should reject batch > 10k items', () => {
            const tooLarge = Array.from({ length: 10001 }, (_, i) => ({
                Age: 25,
                'Annual Income ($)': 50000,
                'Spending Score (1-100)': 50,
            }));
            return request(app.getHttpServer())
                .post('/api/v2/segment')
                .set('Authorization', `Bearer ${accessToken}`)
                .send(tooLarge)
                .expect(400);
        });
        it('should handle invalid age values in segment', () => {
            return request(app.getHttpServer())
                .post('/api/v2/segment')
                .set('Authorization', `Bearer ${accessToken}`)
                .send([
                {
                    Age: 'invalid',
                    'Annual Income ($)': 50000,
                    'Spending Score (1-100)': 50,
                },
            ])
                .expect(400);
        });
    });
    describe('POST /api/v2/recommendations/natural', () => {
        it('should require authentication', () => {
            return request(app.getHttpServer())
                .post('/api/v2/recommendations/natural')
                .send({ query: 'What products should I recommend?' })
                .expect(401);
        });
        it('should provide recommendations with valid query', () => {
            return request(app.getHttpServer())
                .post('/api/v2/recommendations/natural')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ query: 'What are the best upsell strategies?' })
                .expect(201)
                .expect((res) => {
                expect(res.body).toHaveProperty('recommendation');
                expect(typeof res.body.recommendation).toBe('string');
                expect(res.body.recommendation.length > 0).toBe(true);
                expect(res.body).toHaveProperty('source');
                expect(['groq', 'rule_based']).toContain(res.body.source);
            });
        });
        it('should reject empty query', () => {
            return request(app.getHttpServer())
                .post('/api/v2/recommendations/natural')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ query: '' })
                .expect(400);
        });
        it('should reject query < 3 chars', () => {
            return request(app.getHttpServer())
                .post('/api/v2/recommendations/natural')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ query: 'ab' })
                .expect(400);
        });
        it('should reject query > 1000 chars', () => {
            return request(app.getHttpServer())
                .post('/api/v2/recommendations/natural')
                .set('Authorization', `Bearer ${accessToken}`)
                .send({ query: 'a'.repeat(1001) })
                .expect(400);
        });
    });
});
//# sourceMappingURL=analytics.e2e-spec.js.map