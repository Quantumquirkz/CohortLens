import { Test, TestingModule } from '@nestjs/testing';

// ensure v2 is enabled for tests by default
process.env.FEATURE_FLAG_V2_ENABLED = 'true';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Analytics Endpoints (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    // override PrismaService with a lightweight stub so tests don't require
    // a real database or NEON_DATABASE_URL environment variable.  The real
    // service is heavily used by AnalyticsService, so we provide minimal
    // implementations for the methods called during the tests.
    // using `any` for simplicity to avoid complex PrismaPromise typings
    const prismaStub: any = {
      $connect: async () => {},
      $queryRaw: async () => [] as any,
      user: { findUnique: async () => null },
      subscription: { findFirst: async () => null } as any,
      apiUsage: {
        upsert: async () => ({ id: 1, callCount: 0 }) as any,
        update: async () => ({} as any),
        findUnique: async () => null as any,
      } as any,
      prediction: { create: async () => {} } as any,
      auditLog: { create: async () => {} } as any,
      segment: { createMany: async () => {} } as any,
      customer: { findMany: async () => [] } as any,
      featureFlagRecord: {
        findMany: async () => [],
        upsert: async () => ({}),
      },
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaStub)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    // Get valid token for protected endpoints
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
        .expect((res: any) => {
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
        .expect((res: any) => {
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
        .expect((res: any) => {
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
        .expect((res: any) => {
          expect(res.body.clusters.length).toBe(100);
          expect(res.body.clusters.every((c: number) => c >= 0 && c <= 5)).toBe(true);
        });
    });

    it('should accept empty batch gracefully', () => {
      return request(app.getHttpServer())
        .post('/api/v2/segment')
        .set('Authorization', `Bearer ${accessToken}`)
        .send([])
        .expect(201)
        .expect((res: any) => {
          expect(res.body.clusters).toEqual([]);
        });
    });

    it('should reject batch > 10k items (payload limit)', () => {
      const tooLarge = Array.from({ length: 10001 }, (_, i) => ({
        Age: 25,
        'Annual Income ($)': 50000,
        'Spending Score (1-100)': 50,
      }));

      return request(app.getHttpServer())
        .post('/api/v2/segment')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(tooLarge)
        .expect((res: any) => {
          expect([400, 413]).toContain(res.status);
        });
    });

    it('should handle invalid age values in segment by returning clusters (may be NaN)', () => {
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
        .expect(201);
    });
  });

  describe('POST /api/v2/recommendations/natural', () => {
    it('should require authentication', () => {
      return request(app.getHttpServer())
        .post('/api/v2/recommendations/natural')
        .send({ query: 'What products should I recommend?' })
        .expect(401);
    });

    it('should provide recommendations with valid query (returns stubbed or empty)', () => {
      return request(app.getHttpServer())
        .post('/api/v2/recommendations/natural')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ query: 'What are the best upsell strategies?' })
        .expect(201)
        .expect((res: any) => {
          // response body may be empty since underlying database calls are stubbed
          expect(res.body).toHaveProperty('recommendation');
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
