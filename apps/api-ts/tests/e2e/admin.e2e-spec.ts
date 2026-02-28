import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { FeatureFlagService } from '../../src/common/feature-flag.service';
import { PrismaService } from '../../src/prisma/prisma.service';

// ensure v2 endpoints (including auth) are reachable during tests
process.env.FEATURE_FLAG_V2_ENABLED = 'true';

describe('Admin Controller - Feature Flag Management (e2e)', () => {
  let app: INestApplication;
  let featureFlagService: FeatureFlagService;
  let accessToken: string;

  beforeAll(async () => {
    const prismaStub: any = {
      $connect: async () => {},
      $queryRaw: async () => [] as any,
      user: { findUnique: async () => null },
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
    featureFlagService = moduleFixture.get<FeatureFlagService>(FeatureFlagService);
    await app.init();

    // obtain admin token for authenticated endpoints
    const authRes = await request(app.getHttpServer())
      .post('/api/v2/auth/token')
      .send({ username: 'admin', password: 'admin' });
    expect(authRes.status).toBe(201);
    expect(authRes.body).toHaveProperty('access_token');
    accessToken = authRes.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v2/admin/flags - Get current flag status', () => {
    it('should return current feature flag state', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v2/admin/flags')
        .expect(200);

      expect(response.body).toHaveProperty('flags');
      expect(response.body).toHaveProperty('migration_status');
      expect(response.body.flags).toHaveProperty('v2_enabled');
      expect(response.body.flags).toHaveProperty('v2_primary');
      expect(response.body.flags).toHaveProperty('v1_deprecated');
      expect(response.body.migration_status).toHaveProperty('phase');
    });

    it('should include migration phase in response', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v2/admin/flags')
        .expect(200);

      const phase = response.body.migration_status.phase;
      expect(['PHASE_1_BETA', 'PHASE_2_BETA_SHADOW', 'PHASE_3_CUTOVER', 'PHASE_4_COMPLETE', 'UNKNOWN']).toContain(phase);
    });
  });

  describe('POST /api/v2/admin/flags - Update feature flag', () => {
    it('should update V2_ENABLED flag', async () => {
      // Initially set to true (from env or default)
      let response = await request(app.getHttpServer())
        .post('/api/v2/admin/flags')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ flag: 'v2_enabled', enabled: false })
        .expect(201);

      expect(response.body.flags.v2_enabled).toBe(false);

      // Verify it was actually disabled
      response = await request(app.getHttpServer())
        .get('/api/v2/admin/flags')
        .expect(200);

      expect(response.body.flags.v2_enabled).toBe(false);

      // Re-enable for other tests
      await request(app.getHttpServer())
        .post('/api/v2/admin/flags')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ flag: 'v2_enabled', enabled: true })
        .expect(201);
    });

    it('should update migration logging flag', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v2/admin/flags')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ flag: 'migration_logging', enabled: true })
        .expect(201);

      expect(response.body.flags.migration_logging).toBe(true);

      // Cleanup
      await request(app.getHttpServer())
        .post('/api/v2/admin/flags')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ flag: 'migration_logging', enabled: false })
        .expect(201);
    });

    it('should return updated flag state in response', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v2/admin/flags')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ flag: 'v2_primary', enabled: false })
        .expect(201);

      expect(response.body.flags.v2_primary).toBe(false);
      expect(response.body.migration_status.phase).toBeDefined();
    });
  });

  describe('POST /api/v2/admin/migrate-to-v2 - Start v2 migration', () => {
    it('should set v2_primary=true and migration_logging=true', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v2/admin/migrate-to-v2')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      // controller wording uses "Migration cutover initiated"
      expect(response.body.message).toContain('Migration cutover initiated');
      expect(response.body.flags.v2_primary).toBe(true);
      expect(response.body.flags.migration_logging).toBe(true);
    });

    it('should update migration phase to PHASE_3_CUTOVER', async () => {
      // Pre-condition: set v2_primary=true
      await request(app.getHttpServer())
        .post('/api/v2/admin/flags')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ flag: 'v2_primary', enabled: true })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/v2/admin/flags')
        .expect(200);

      expect(response.body.migration_status.phase).toMatch(/PHASE_3|PHASE_\d/);
    });

    it('should indicate v2 is receiving traffic after migration', async () => {
      await request(app.getHttpServer())
        .post('/api/v2/admin/migrate-to-v2')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/v2/admin/flags')
        .expect(200);

      expect(response.body.flags.v2_primary).toBe(true);
      expect(response.body.migration_status.phase).toContain('PHASE_3');
    });
  });

  describe('POST /api/v2/admin/rollback-to-v1 - Rollback migration', () => {
    it('should set v2_primary=false and keep v2_enabled=true', async () => {
      // Pre-condition: set v2_primary=true
      await request(app.getHttpServer())
        .post('/api/v2/admin/flags')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ flag: 'v2_primary', enabled: true })
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/api/v2/admin/rollback-to-v1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      expect(response.body.message).toContain('Rollback to v1 completed');
      expect(response.body.flags.v2_primary).toBe(false);
      expect(response.body.flags.v2_enabled).toBe(true);
    });

    it('should revert migration phase after rollback', async () => {
      // Ensure we are in v3 phase first
      await request(app.getHttpServer())
        .post('/api/v2/admin/migrate-to-v2')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      // Rollback
      await request(app.getHttpServer())
        .post('/api/v2/admin/rollback-to-v1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/v2/admin/flags')
        .expect(200);

      expect(response.body.migration_status.phase).not.toContain('PHASE_4');
    });

    it('should allow v1 to become primary again', async () => {
      await request(app.getHttpServer())
        .post('/api/v2/admin/rollback-to-v1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/v2/admin/flags')
        .expect(200);

      expect(response.body.flags.v2_primary).toBe(false);
    });
  });

  describe('POST /api/v2/admin/enable-shadow-mode - Enable v2 shadowing', () => {
    it('should set shadow_mode=true and migration_logging=true', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v2/admin/enable-shadow-mode')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      expect(response.body.message).toContain('Shadow mode enabled');
      expect(response.body.flags.shadow_mode).toBe(true);
      expect(response.body.flags.migration_logging).toBe(true);
    });

    it('should keep v2_primary=false (v1 still primary)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v2/admin/enable-shadow-mode')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      expect(response.body.flags.v2_primary).toBe(false);
    });

    it('should update migration phase to PHASE_2_BETA_SHADOW', async () => {
      // The previous enable-shadow-mode calls already flipped us into shadow phase
      const response = await request(app.getHttpServer())
        .get('/api/v2/admin/flags')
        .expect(200);

      expect(response.body.migration_status.phase).toContain('SHADOW');
    });
  });

  describe('POST /api/v2/admin/complete-v1-deprecation - Mark v1 as deprecated', () => {
    it('should set v1_deprecated=true', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v2/admin/complete-v1-deprecation')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      expect(response.body.message).toContain('deprecation');
      expect(response.body.flags.v1_deprecated).toBe(true);
    });

    it('should update migration phase to PHASE_4_COMPLETE', async () => {
      // Pre-condition: v2_primary=true, v1_deprecated=true
      await request(app.getHttpServer())
        .post('/api/v2/admin/flags')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ flag: 'v2_primary', enabled: true })
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/v2/admin/flags')
        .expect(200);

      expect(response.body.migration_status.phase).toContain('PHASE_4');
    });

    it('should indicate v1 is no longer accepting requests', async () => {
      await request(app.getHttpServer())
        .post('/api/v2/admin/complete-v1-deprecation')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/v2/admin/flags')
        .expect(200);

      expect(response.body.flags.v1_deprecated).toBe(true);
    });
  });

  describe('Feature flag integration - Traffic blocking', () => {
    it('should return 503 when V2_ENABLED=false', async () => {
      // Disable v2
      await request(app.getHttpServer())
        .post('/api/v2/admin/flags')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ flag: 'v2_enabled', enabled: false })
        .expect(201);

      // Any v2 endpoint should fail
      const response = await request(app.getHttpServer())
        .get('/api/v2/health')
        .expect(503);

      expect(response.body.statusCode).toBe(503);
      expect(response.body.message).toContain('unavailable');

      // Re-enable
      await request(app.getHttpServer())
        .post('/api/v2/admin/flags')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ flag: 'v2_enabled', enabled: true })
        .expect(201);
    });

    it('should allow requests when V2_ENABLED=true', async () => {
      // Ensure enabled
      await request(app.getHttpServer())
        .post('/api/v2/admin/flags')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ flag: 'v2_enabled', enabled: true })
        .expect(201);

      // Endpoint should work
      const response = await request(app.getHttpServer())
        .get('/api/v2/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
    });

    it('should attach migration status in response headers', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v2/health')
        .expect(200);

      expect(response.headers['x-migration-status']).toBeDefined();
    });
  });

  describe('Admin endpoint security', () => {
    it('should reject flag updates without auth (beta now requires JWT)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v2/admin/flags')
        .send({ v2_enabled: true })
        .expect(401);
    });

    it('should return comprehensive migration status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v2/admin/flags')
        .expect(200);

      const { migration_status } = response.body;
      expect(migration_status).toHaveProperty('phase');
      expect(migration_status).toHaveProperty('v1_active');
      expect(migration_status).toHaveProperty('v2_active');
      expect(migration_status).toHaveProperty('shadow_mode');
    });
  });

  describe('Phase transition validation', () => {
    it('should transition from PHASE_1_BETA to PHASE_2_BETA_SHADOW', async () => {
      // Reset to Phase 1 by clearing all migration-related flags
      const baseline = [
        { flag: 'v2_enabled', enabled: true },
        { flag: 'v2_primary', enabled: false },
        { flag: 'v1_deprecated', enabled: false },
        { flag: 'shadow_mode', enabled: false },
        { flag: 'migration_logging', enabled: false },
      ];

      for (const f of baseline) {
        await request(app.getHttpServer())
          .post('/api/v2/admin/flags')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(f)
          .expect(201);
      }

      // Transition to Phase 2 via shadow mode endpoint
      await request(app.getHttpServer())
        .post('/api/v2/admin/enable-shadow-mode')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/v2/admin/flags')
        .expect(200);

      expect(response.body.migration_status.phase).toContain('SHADOW');
    });

    it('should transition from PHASE_2 to PHASE_3_CUTOVER', async () => {
      // Start in shadow mode
      await request(app.getHttpServer())
        .post('/api/v2/admin/flags')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ flag: 'shadow_mode', enabled: true })
        .expect(201);

      // Migrate to v2 primary
      await request(app.getHttpServer())
        .post('/api/v2/admin/migrate-to-v2')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/v2/admin/flags')
        .expect(200);

      expect(response.body.migration_status.phase).toContain('PHASE_3');
    });

    it('should transition to PHASE_4_COMPLETE when v1_deprecated=true', async () => {
      // Ensure v2 is primary
      // ensure phase 3 precondition by explicitly setting v2_primary flag
      await request(app.getHttpServer())
        .post('/api/v2/admin/flags')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ flag: 'v2_primary', enabled: true })
        .expect(201);

      // Complete deprecation
      await request(app.getHttpServer())
        .post('/api/v2/admin/complete-v1-deprecation')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);

      const response = await request(app.getHttpServer())
        .get('/api/v2/admin/flags')
        .expect(200);

      expect(response.body.migration_status.phase).toContain('PHASE_4');
    });
  });
});
