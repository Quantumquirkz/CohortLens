import { Test, TestingModule } from '@nestjs/testing';

// health endpoints are under v2 as well
process.env.FEATURE_FLAG_V2_ENABLED = 'true';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Health Endpoint (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // stub PrismaService as in analytics tests; health only needs to avoid
    // connecting during module init
    const prismaStub: any = {
      $connect: async () => {},
      $queryRaw: async () => [] as any,
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
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v2/health - should return service health', () => {
    return request(app.getHttpServer())
      .get('/api/v2/health')
      .expect(200)
      .expect((res: any) => {
        expect(res.body).toHaveProperty('status');
        expect(res.body.status).toBe('ok');
        expect(res.body).toHaveProperty('service');
        expect(res.body.service).toBe('cohortlens');
        expect(res.body).toHaveProperty('version');
        expect(res.body).toHaveProperty('neon_db');
        expect(res.body).toHaveProperty('timestamp');
        expect(typeof res.body.timestamp).toBe('string');
      });
  });

  it('GET /api/v2/health - neon_db status should be "not_configured" or "connected" or "error"', () => {
    return request(app.getHttpServer())
      .get('/api/v2/health')
      .expect(200)
      .expect((res: any) => {
        expect(['not_configured', 'connected', 'error']).toContain(res.body.neon_db);
      });
  });
});
