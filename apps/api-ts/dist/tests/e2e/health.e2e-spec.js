"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
process.env.FEATURE_FLAG_V2_ENABLED = 'true';
const common_1 = require("@nestjs/common");
const request = require("supertest");
const app_module_1 = require("../../src/app.module");
const prisma_service_1 = require("../../src/prisma/prisma.service");
describe('Health Endpoint (e2e)', () => {
    let app;
    beforeAll(async () => {
        const prismaStub = {
            $connect: async () => { },
            $queryRaw: async () => [],
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
    it('GET /api/v2/health - should return service health', () => {
        return request(app.getHttpServer())
            .get('/api/v2/health')
            .expect(200)
            .expect((res) => {
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
            .expect((res) => {
            expect(['not_configured', 'connected', 'error']).toContain(res.body.neon_db);
        });
    });
});
//# sourceMappingURL=health.e2e-spec.js.map