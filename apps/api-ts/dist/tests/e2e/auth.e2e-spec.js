"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
process.env.FEATURE_FLAG_V2_ENABLED = 'true';
const common_1 = require("@nestjs/common");
const request = require("supertest");
const app_module_1 = require("../../src/app.module");
const prisma_service_1 = require("../../src/prisma/prisma.service");
describe('Auth Endpoint (e2e)', () => {
    let app;
    beforeAll(async () => {
        const prismaStub = {
            $connect: async () => { },
            $queryRaw: async () => [],
            user: { findUnique: async () => null },
            featureFlagRecord: {
                findMany: async () => [],
                upsert: async () => ({}),
            },
        };
        const moduleFixture = await testing_1.Test.createTestingModule({
            imports: [app_module_1.AppModule],
        })
            .overrideProvider(prisma_service_1.PrismaService)
            .useValue(prismaStub)
            .compile();
        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, transform: true }));
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
            .expect((res) => {
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
//# sourceMappingURL=auth.e2e-spec.js.map