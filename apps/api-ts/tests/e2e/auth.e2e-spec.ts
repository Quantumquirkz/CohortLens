import { Test, TestingModule } from '@nestjs/testing';

// ensure v2 endpoints are reachable during tests
process.env.FEATURE_FLAG_V2_ENABLED = 'true';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Auth Endpoint (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const prismaStub: any = {
      $connect: async () => {},
      $queryRaw: async () => [] as any,
      // support user lookup for auth validation
      user: { findUnique: async () => null },
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

  it('POST /api/v2/auth/token - should return access_token with valid credentials', () => {
    return request(app.getHttpServer())
      .post('/api/v2/auth/token')
      .send({ username: 'admin', password: 'admin' })
      .expect(201)
      .expect((res: any) => {
        expect(res.body).toHaveProperty('access_token');
        expect(typeof res.body.access_token).toBe('string');
        expect(res.body.access_token.length).toBeGreaterThan(0);
        expect(res.body).toHaveProperty('token_type');
        expect(res.body.token_type).toBe('bearer');
        expect(res.body).toHaveProperty('expires_in');
        expect(typeof res.body.expires_in).toBe('number');
        expect(res.body.expires_in).toBeGreaterThan(0);
      });
  });

  it('POST /api/v2/auth/token - should return 401 with invalid credentials', () => {
    return request(app.getHttpServer())
      .post('/api/v2/auth/token')
      .send({ username: 'invalid_user', password: 'wrong_password' })
      .expect(401);
  });

  it('POST /api/v2/auth/token - should validate required fields', () => {
    return request(app.getHttpServer())
      .post('/api/v2/auth/token')
      .send({})
      // validation pipe triggers bad request for missing properties
      .expect(400);
  });

  it('POST /api/v2/auth/token - should reject empty username', () => {
    return request(app.getHttpServer())
      .post('/api/v2/auth/token')
      .send({ username: '', password: 'password' })
      // allow either validation 400 or authentication 401
      .expect(res => {
        if (![400, 401].includes(res.status)) {
          throw new Error(`expected 400 or 401, got ${res.status}`);
        }
      });
  });

  it('POST /api/v2/auth/token - should reject empty password', () => {
    return request(app.getHttpServer())
      .post('/api/v2/auth/token')
      .send({ username: 'user', password: '' })
      .expect(res => {
        if (![400, 401].includes(res.status)) {
          throw new Error(`expected 400 or 401, got ${res.status}`);
        }
      });
  });
});
