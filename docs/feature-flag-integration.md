# Feature Flag Integration Guide

This guide explains how feature flags control traffic routing and enable safe migration from v1 to v2.

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│ Client Request                                      │
│ (Mobile app, Web client, etc)                       │
└────────────────┬──────────────────────────────────┘
                 │
                 ▼
         ┌───────────────┐
         │ FeatureFlagMiddleware  ◄─── Feature flags
         │ - Check V2_ENABLED      │    from .env
         │ - Log metrics           │
         │ - Route traffic         │
         └───────┬─────────────────┘
                 │
         ┌───────▼──────────┐
         │ v2 Endpoint      │
         │ (Auth, Analytics)│
         └──────────────────┘
```

## Flow by Phase

### Phase 1: Beta (V2_ENABLED=true, V2_PRIMARY=false)
```
Client Request → V2 Middleware → V2_ENABLED check (✓)
                 → Route to V2 endpoint
                 → V2 processes request
                 → Response returned
                 → Logs written (if MIGRATION_LOGGING=true)

v1 API still accepts requests (old clients)
v2 API available for testing
```

### Phase 2: Shadow Mode (SHADOW_MODE=true, V2_ENABLED=true)
```
Client Request → V1 API processes request
              → Internally duplicates request to V2
              → V2 processes in background (silent)
              → V1 response returned to client
              → V2 response logged (not returned)
              → Comparison metrics written

v1 returns Normal responses
v2 shadows transactions (logged but hidden)
```

### Phase 3: Cutover (V2_PRIMARY=true, V1_DEPRECATED=false)
```
Client Request → V2 Middleware → V2_ENABLED check (✓)
                 → Route to V2 endpoint (not v1)
                 → V2 processes request
                 → Response returned

v2 receives all traffic
v1 still running (for rollback)
```

### Phase 4: Deprecation (V1_DEPRECATED=true)
```
Client Request → V1 endpoint → Returns 410 Gone
              → "API v1 has been deprecated, please upgrade to v2"

v2 receives all traffic
v1 endpoints no longer functional
```

## Implementation: Feature Flag Guard

### Usage in Controllers

```typescript
import { UseGuards } from '@nestjs/common';
import { FeatureFlagV2Guard } from '../common/feature-flag.guard';

@Controller('/api/v2/auth')
export class AuthController {
  
  // Gate endpoint behind v2 availability flag
  @Post('/token')
  @UseGuards(FeatureFlagV2Guard)
  createToken(@Body() body: LoginDto) {
    return this.authService.token(body.username, body.password);
  }
}
```

### Guard Behavior

If `V2_ENABLED=false`:
```
POST /api/v2/auth/token
→ Guard checks V2_ENABLED
→ Returns 503 Service Unavailable
→ Body: { message: 'v2 API is temporarily unavailable' }
```

If `V2_ENABLED=true`:
```
POST /api/v2/auth/token
→ Guard passes
→ Endpoint executes normally
→ Response returned
```

## Implementation: Feature Flag Middleware

### Global Request Handling

Applied to all `/api/v2/*` routes via `AppModule`:

```typescript
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(FeatureFlagMiddleware)
      .forRoutes('/api/v2/*');
  }
}
```

### Middleware Functions

1. **Feature flag validation**
   - Check `V2_ENABLED` at entry point
   - Return 503 if disabled (killswitch)

2. **Request logging**
   - If `MIGRATION_LOGGING=true`:
     - Log endpoint, method, status code
     - Track response time
   - Attach `X-Migration-Status` header

3. **Performance monitoring**
   - Measure request duration
   - Set `X-V2-Response-Time` header
   - Store in logs for analysis

## Implementation: Admin Endpoints

### Check Current Status

```bash
curl http://localhost:8001/api/v2/admin/flags
```

Response:
```json
{
  "flags": {
    "v2_primary": false,
    "v2_enabled": true,
    "v1_deprecated": false,
    "shadow_mode": false,
    "migration_logging": false
  },
  "migration_status": {
    "phase": "PHASE_1_BETA",
    "v1_active": true,
    "v2_active": true,
    "shadow_mode": false
  }
}
```

### Enable Killswitch (Emergency)

```bash
# Disable v2 immediately in production
curl -X POST http://localhost:8001/api/v2/admin/flags \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"v2_enabled": false}'

# Result: All v2 endpoints return 503 until re-enabled
```

### Execute Migration

```bash
curl -X POST http://localhost:8001/api/v2/admin/migrate-to-v2 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"

# Sets: v2_primary=true, v1_deprecated=false (v2 receives traffic, v1 still available)
```

### Rollback to v1

```bash
curl -X POST http://localhost:8001/api/v2/admin/rollback-to-v1 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"

# Sets: v2_primary=false (v1 becomes primary again)
```

## Monitoring & Debugging

### Check if v2 is enabled

```bash
curl http://localhost:8001/api/v2/admin/flags | jq '.flags.v2_enabled'
# Output: true (v2 running) or false (v2 disabled)
```

### Check migration phase

```bash
curl http://localhost:8001/api/v2/admin/flags | jq '.migration_status.phase'
# Output: PHASE_1_BETA, PHASE_2_BETA_SHADOW, PHASE_3_CUTOVER, or PHASE_4_COMPLETE
```

### Monitor v2 requests with logging

```bash
# Enable migration logging
curl -X POST http://localhost:8001/api/v2/admin/flags \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"migration_logging": true}'

# Now all v2 requests log:
docker logs cohortlens-api-ts | grep V2_ENDPOINT
# Output: [V2_ENDPOINT] POST /api/v2/auth/token 200 45ms
```

### Verify feature flag service

```bash
# In NestJS shell or test:
const flags = app.get(FeatureFlagService);
console.log(flags.isEnabled('V2_ENABLED')); // true/false
console.log(flags.getMigrationStatus());     // { phase, v1_active, v2_active, ... }
```

## Testing Feature Flags

### Unit Test Example

```typescript
describe('FeatureFlagMiddleware', () => {
  it('should return 503 when v2_enabled is false', async () => {
    const mockRequest = { path: '/api/v2/predict' } as Request;
    const mockResponse = { status: jest.fn().json: jest.fn() } as Response;
    
    jest.spyOn(featureFlagService, 'isEnabled').mockReturnValue(false);
    
    middleware.use(mockRequest, mockResponse, jest.fn());
    
    expect(mockResponse.status).toHaveBeenCalledWith(503);
  });

  it('should proceed when v2_enabled is true', async () => {
    jest.spyOn(featureFlagService, 'isEnabled').mockReturnValue(true);
    
    const nextFn = jest.fn();
    middleware.use(mockRequest, mockResponse, nextFn);
    
    expect(nextFn).toHaveBeenCalled();
  });
});
```

### Integration Test Example

```typescript
describe('v2 Features with Flags (e2e)', () => {
  it('should block requests when V2_ENABLED is false', async () => {
    // Set flag to false
    await adminController.updateFlag('V2_ENABLED', false);
    
    // Request should fail
    const response = await request(app.getHttpServer())
      .post('/api/v2/auth/token')
      .send({ username: 'test', password: 'test' })
      .expect(503);
    
    expect(response.body.message).toContain('unavailable');
  });

  it('should allow requests when V2_ENABLED is true', async () => {
    // Set flag to true
    await adminController.updateFlag('V2_ENABLED', true);
    
    // Request should succeed
    const response = await request(app.getHttpServer())
      .post('/api/v2/auth/token')
      .send({ username: 'test', password: 'test' })
      .expect(200);
    
    expect(response.body).toHaveProperty('token');
  });
});
```

## Environment Variables Reference

All feature flags load from environment at startup:

```bash
# .env (apps/api-ts/.env)

# Phase 1: Beta testing
FEATURE_FLAG_V2_ENABLED=true        # v2 API available
FEATURE_FLAG_V2_PRIMARY=false       # v1 still primary
FEATURE_FLAG_V1_DEPRECATED=false    # v1 still serving
FEATURE_FLAG_SHADOW_MODE=false      # v2 not shadowing
FEATURE_FLAG_MIGRATION_LOGGING=false # No extra logs

# Transition to Phase 2: Shadow mode
# FEATURE_FLAG_SHADOW_MODE=true
# FEATURE_FLAG_MIGRATION_LOGGING=true

# Transition to Phase 3: Cutover
# FEATURE_FLAG_V2_PRIMARY=true
# FEATURE_FLAG_SHADOW_MODE=false

# Transition to Phase 4: Deprecation
# FEATURE_FLAG_V1_DEPRECATED=true
```

## Emergency Procedures

### Killswitch: Disable v2 immediately
```bash
curl -X POST http://localhost:8001/api/v2/admin/flags \
  -d '{"v2_enabled": false}'
# All v2 endpoints return 503 until fixed
```

### Rollback: Switch back to v1
```bash
curl -X POST http://localhost:8001/api/v2/admin/rollback-to-v1
# v1 becomes primary, v2 disabled or shadowed
```

### Enable logging: Debug production issues
```bash
curl -X POST http://localhost:8001/api/v2/admin/flags \
  -d '{"migration_logging": true}'
# All v2 requests logged for investigation
```

## Next Steps

1. ✅ Feature flags created (FeatureFlagService)
2. ✅ Guard implementation done (FeatureFlagGuard, FeatureFlagV2Guard)
3. ✅ Middleware integrated (FeatureFlagMiddleware in AppModule)
4. ⏳ **Test Admin Endpoints** — Create e2e tests for /admin/* endpoints
5. ⏳ **Integration Test** — Verify flag behavior in endpoint gating
6. ⏳ **Performance Test** — Run baseline with flags enabled
