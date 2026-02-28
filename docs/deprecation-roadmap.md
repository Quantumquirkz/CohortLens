# Deprecation Plan: Python Backend → TypeScript/NestJS Migration

## Overview
CohortLens is migrating from a Python (FastAPI) backend to TypeScript (NestJS). This document outlines the deprecation timeline and rollout strategy for the migration.

**Timeline**: 4 weeks (Target: March 28, 2026)
**Status**: Phase 1 (Beta testing) - Started Feb 28, 2026

---

## Migration Phases

### Phase 1: Beta Testing (Week 1-2)
**Status**: ✅ IN PROGRESS
**Timeline**: Feb 28 - Mar 13, 2026

**Feature Flags**:
- `V2_ENABLED=true`
- `V2_PRIMARY=false` (v1 still primary)
- `V1_DEPRECATED=false`

**What's happening**:
- v2 API available at `/api/v2/*` alongside v1
- Internal testing and validation
- No-regression testing running daily
- Performance baselines being collected
- Mobile app integration testing

**Client impact**: None (v1 unchanged)

**Validation gates**:
- [ ] E2E tests passing 100%
- [ ] Performance p95 < 500ms for predict/segment
- [ ] No-regression delta < 5% on 50 sample cases
- [ ] Mobile app connects successfully
- [ ] All cluster assignments stable

**Exit criteria**:
- All validation gates green
- Internal + beta tester feedback positive
- Prepare cut-over date

---

### Phase 2: Shadow Mode (Week 2-3)
**Timeline**: Mar 6 - Mar 20, 2026 (overlaps Phase 1)

**Feature Flags**:
- `SHADOW_MODE=true`
- `V2_PRIMARY=false` (v1 still primary)
- `V2_ENABLED=true`
- `MIGRATION_LOGGING=true`

**What's happening**:
- v1 receives 100% of production traffic
- v2 shadows/copies all requests (silent mode)
- v2 responses logged but NOT returned to clients
- Compare v1 vs v2 outputs in production traffic
- Monitor error rates and performance with real load

**Client impact**: None

**Success criteria**:
- v2 processes 100% of production traffic successfully
- v2 error rate < 0.1%
- No no customer-visible issues
- Confidence high for cutover

**Exit criteria**:
- 7 consecutive days of shadow mode with <0.1% error rate
- Schedule cutover for next Tuesday 2am UTC

---

### Phase 3: Cutover (Week 3-4)
**Timeline**: Mar 13 - Mar 20, 2026

**Feature Flags**:
- `V2_PRIMARY=true` (v2 receives traffic)
- `V1_DEPRECATED=false` (v1 still available)
- `SHADOW_MODE=false`

**What's happening**:
- All new requests → v2
- v1 still operational (for rollback if needed)
- Close monitoring of v2 performance
- Ready to rollback to v1 at first sign of issues

**Client impact**: Transparent (same behavior, different backend)

**Monitoring**:
- Error rates (target: <0.1%)
- Latency p95 (target: <500ms)
- Business metrics (predictions, segments, recommendations)

**Rollback triggers**:
- Error rate > 1%
- Latency p95 > 2000ms
- Customer complaints
- Data inconsistency detected

**Example rollback**:
```bash
# If issues detected:
curl -X POST http://localhost:8001/api/v2/admin/rollback-to-v1 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

**Exit criteria**:
- 7 days with v2 primary, error rate <0.1%
- No rollbacks needed
- Confidence in v2 stability

---

### Phase 4: Python Deprecation (Week 4+)
**Timeline**: Mar 20 - Mar 28, 2026

**Feature Flags**:
- `V2_PRIMARY=true`
- `V1_DEPRECATED=true` (v1 endpoints return 410 Gone)

**What's happening**:
- All v1 endpoints return HTTP 410 (Gone) with deprecation notice
- Clients forced to use v2 only
- Python backend can be safely removed

**Environment changes**:
- Remove `apps/api/` from CI/CD
- Stop running Python dependencies
- Update docs to reference v2 only
- Archive/delete `frontend/` and `apps/web/`

**Final cleanup**:
```bash
# Week 5+ (after confirming no issues):
git rm -r apps/api
git rm -r apps/web
git rm -r frontend
# Keep apps/api-ts as new backend
# Keep apps/mobile as new frontend
```

---

## Operation

### Admin APIs for Flag Control

#### Get current status:
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
    "shadow_mode": false
  },
  "migration_status": {
    "phase": "PHASE_1_BETA",
    "v1_active": true,
    "v2_active": true,
    "shadow_mode": false
  }
}
```

#### Start cutover to v2:
```bash
curl -X POST http://localhost:8001/api/v2/admin/migrate-to-v2 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

#### Rollback to v1:
```bash
curl -X POST http://localhost:8001/api/v2/admin/rollback-to-v1 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

#### Enable shadow mode:
```bash
curl -X POST http://localhost:8001/api/v2/admin/enable-shadow-mode \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

#### Complete v1 deprecation:
```bash
curl -X POST http://localhost:8001/api/v2/admin/complete-v1-deprecation \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

---

## Feature Flags Reference

### V2_ENABLED
- **Default**: false
- **Scope**: Entire v2 API
- **Effect**: When false, all v2 endpoints return 503 Service Unavailable
- **Use case**: Quick kill-switch if critical bug discovered

### V2_PRIMARY
- **Default**: false
- **Scope**: Traffic routing
- **Effect**: When true, v2 receives production traffic; v1 returns 410 Gone
- **Use case**: Switching primary backend

### V1_DEPRECATED
- **Default**: false
- **Scope**: v1 endpoint responses
- **Effect**: When true, v1 endpoints return 410 Gone instead of processing
- **Use case**: Force client upgrade, cleanup phase

### SHADOW_MODE
- **Default**: false
- **Scope**: Request duplication
- **Effect**: When true, v1 receives request, v2 shadows copy, v1 response returned
- **Use case**: Validate v2 with real production traffic before cutover

### MIGRATION_LOGGING
- **Default**: false
- **Scope**: Logging and monitoring
- **Effect**: When true, detailed v1 vs v2 comparison logs emitted
- **Use case**: Debugging production issues, validating migration

---

## Runbook

### Weekly Validation Checklist (Phase 1)

**Monday**:
- [ ] Run `pnpm validate:no-regression:local` (50 case sample)
- [ ] Check no-regression report delta < 5%
- [ ] Review e2e test results
- [ ] Check latest commits in mobile app

**Wednesday**:
- [ ] Run `pnpm perf:baseline:local`
- [ ] Verify p95 latencies meet targets
- [ ] Check database migrations applied cleanly
- [ ] Review any error logs

**Friday**:
- [ ] Full integration test: login → predict → segment → recommendations
- [ ] Test on iOS simulator (pnpm --filter @cohortlens/mobile ios)
- [ ] Test on Android simulator (pnpm --filter @cohortlens/mobile android)
- [ ] Test web build (pnpm --filter @cohortlens/mobile web)
- [ ] Sign-off on readiness

### Cutover Day Checklist (Phase 3)

**Before cutover** (T-2h):
- [ ] Confirm v2 passing all tests
- [ ] Confirm shadow mode metrics <0.1% error for 24h
- [ ] Notify team on Slack
- [ ] Have rollback plan reviewed

**Cutover** (T-0):
- [ ] Set V2_PRIMARY=true
- [ ] Monitor dashboards for 30 minutes
- [ ] Check error logs for anomalies

**After cutover** (T+24h to T+7d):
- [ ] Daily error rate check
- [ ] Daily latency check
- [ ] Customer feedback polling
- [ ] Compare metrics v1 vs v2

**If issues** (at any time):
- [ ] Run: `/api/v2/admin/rollback-to-v1`
- [ ] Notify team
- [ ] Investigate and fix
- [ ] Schedule retry

---

## Failure Scenarios & Recovery

### Scenario 1: v2 error rate spikes in shadow mode
**Response**:
1. Query v2 logs: `docker logs cohortlens-api-ts | tail -100`
2. Check recent commits: `git log --oneline -10`
3. Fix bug + deploy
4. Resume shadow mode with: `POST /api/v2/admin/enable-shadow-mode`

### Scenario 2: Latency p95 > 2000ms after cutover
**Response**:
1. Check database performance: `EXPLAIN ANALYZE SELECT ...`
2. Check Neon connection limits
3. Scale horizontally (add more Nest replicas)
4. Or rollback with: `POST /api/v2/admin/rollback-to-v1`

### Scenario 3: No-regression shows 10% delta on predict
**Response**:
1. Investigate delta source (rule changes vs model drift)
2. Review analytics.service.ts prediction logic
3. Compare v1 models vs v2 rules
4. Document expected differences
5. Adjust rules if needed

### Scenario 4: Mobile app can't login post-cutover
**Response**:
1. Verify JWT secret matching v1:v2
2. Check CORS headers in v2
3. Check network logs in mobile app
4. Verify token format hasn't changed

---

## Success Metrics

**By end of Phase 1 (Mar 13)**:
- ✅ All e2e tests passing
- ✅ No-regression delta < 5%
- ✅ Performance p95 < 500ms
- ✅ Mobile app functional
- ✅ Deployment process validated

**By end of Phase 2 (Mar 20)**:
- ✅ Shadow mode running 7 days straight
- ✅ v2 error rate < 0.1% with real traffic
- ✅ Customer acceptance testing passed
- ✅ Rollback procedure validated

**By end of Phase 3 (Mar 20)**:
- ✅ v2 primary for 7 days
- ✅ Error rate < 0.1%
- ✅ Latency p95 < 500ms
- ✅ Zero customer issues

**By end of Phase 4 (Mar 28)**:
- ✅ v1 fully deprecated (410 Gone)
- ✅ Python code archived
- ✅ All clients using v2
- ✅ Database migration complete

---

## Contacts

- **Backend Lead**: Manage v2 deployment, flags
- **Mobile Lead**: Validate app integration
- **DevOps**: Manage infrastructure, monitoring
- **On-call**: Handle production issues during phases 2-3

---

## References

- [Migration Matrix (v1→v2)](./migration-v1-v2.md)
- [Architecture Design](./architecture.md)
- [API Contracts Repo](../packages/contracts/)
- [Feature Flag Service](../apps/api-ts/src/common/feature-flag.service.ts)
- [Admin Controller](../apps/api-ts/src/common/admin.controller.ts)
