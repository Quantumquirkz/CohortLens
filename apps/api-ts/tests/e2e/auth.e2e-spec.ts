import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Auth Endpoint (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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
      .expect(400);
  });

  it('POST /api/v2/auth/token - should reject empty username', () => {
    return request(app.getHttpServer())
      .post('/api/v2/auth/token')
      .send({ username: '', password: 'password' })
      .expect(400);
  });

  it('POST /api/v2/auth/token - should reject empty password', () => {
    return request(app.getHttpServer())
      .post('/api/v2/auth/token')
      .send({ username: 'user', password: '' })
      .expect(400);
  });
});
