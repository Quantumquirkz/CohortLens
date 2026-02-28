# Migration Operational Runbook

Quick reference guide for managing the Python → TypeScript migration.

## TL;DR: Daily Operations

### Check Migration Status
```bash
curl http://localhost:8001/api/v2/admin/flags | jq
```

### Validation (automated)
```bash
# In CI/CD or locally (phase 1-2):
pnpm validate:no-regression:local    # Compare v1↔v2 predictions
pnpm perf:baseline:local              # Measure latencies
```

### Emergency Rollback
```bash
# If v2 has critical issues:
curl -X POST http://localhost:8001/api/v2/admin/rollback-to-v1 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

---

## Phase 1: Beta (Week 1-2)

### 1. Validate Implementation
```bash
# Run e2e tests
pnpm --filter @cohortlens/api-ts test:e2e

# Expected output:
# ✓ 32+ tests passing
# ✓ No TypeScript errors
# ✓ All endpoints responding
```

### 2. Validate No Regressions
```bash
# Start both APIs in separate terminals:
# Terminal 1 (v1):
cd apps/api && python -m uvicorn main:app --port 8000

# Terminal 2 (v2):
cd apps/api-ts && npm run start:dev

# Terminal 3 (test):
pnpm validate:no-regression:local
```

**Success criteria**:
```
✅ Ran 50 predictions
✅ Mean delta: 2.3%  (< 5%)
✅ Max delta: 4.8%   (< 10%)
✅ All segments matched
```

### 3. Validate Performance
```bash
# Measure latency with simulated load
pnpm perf:baseline:local

# Expected output (p95 targets):
# health:         < 100ms ✓
# usage:          < 200ms ✓
# predict:        < 500ms ✓
# segment (10x):  < 500ms ✓
# segment (100x): < 1000ms
# recommendations: < 2500ms ✓
```

### 4. Mobile App Integration
```bash
# Test on iOS
pnpm --filter @cohortlens/mobile ios

# or Android
pnpm --filter @cohortlens/mobile android

# or web
pnpm --filter @cohortlens/mobile web

# Checklist:
# [ ] Login works
# [ ] Dashboard loads
# [ ] Can create prediction
# [ ] Can segment
# [ ] Recommendations display
```

### 5. Weekly Sign-Off
```bash
# Friday before Phase 2:
- All tests passing ✓
- No regressions < 5% ✓
- Performance <500ms ✓
- Mobile tests ✓
- Ready to shadow mode
```

---

## Phase 2: Shadow Mode (Week 2-3)

### 1. Enable Shadow Mode
```bash
curl -X POST http://localhost:8001/api/v2/admin/enable-shadow-mode \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"

# Expected response:
{
  "message": "Shadow mode enabled",
  "status": "v1 primary with v2 shadows enabled"
}
```

### 2. Monitor Shadow Mode
```bash
# Daily check: v2 catching and processing all v1 requests
# Check logs for:
# - v2 error rate < 0.1%
# - v2 latency p95 < 500ms
# - No customer-facing issues
# - v2 responses match v1 (logged, not returned)

# Query logs:
docker logs cohortlens-api-ts | grep -i error | wc -l
# Should be: < 100 errors in 24h (0.1% of ~100k requests)
```

### 3. Confidence Gate
After **7 days** of shadow mode <0.1% error:
```bash
# Confirm with team:
- [ ] Shadow mode error rate < 0.1% for 7 days
- [ ] v2 handling 100% of production traffic silently
- [ ] No unexpected differences in v2 outputs
- [ ] Ready to cutover
```

---

## Phase 3: Cutover (Week 3-4)

### 1. Pre-Cutover (T-2h)
```bash
# Confirm final status
curl http://localhost:8001/api/v2/admin/flags | jq

# Ensure:
# - v2_enabled: true
# - v2_primary: false (about to change)
# - shadow_mode: true (disable before cutover)
# - v1_deprecated: false
```

### 2. Execute Cutover
```bash
# Switch v2 to primary
curl -X POST http://localhost:8001/api/v2/admin/migrate-to-v2 \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"

# Expected response:
{
  "message": "Migrated to v2 primary",
  "status": {
    "v2_primary": true,
    "shadow_mode": false,
    "migration_logging": true
  }
}
```

### 3. Immediate Post-Cutover Monitoring (T+0 to T+30m)
```bash
# Monitor every 5 minutes:
curl http://localhost:8001/api/v2/admin/flags | jq '.migration_status'

# Check dashboards:
# - Error rate (should stay < 0.1%)
# - Latency p95 (should stay < 500ms)
# - Database connections (should be stable)
# - Customer activity (should be normal)
```

### 4. Rollback Decision (if needed)
```bash
# IMMEDIATE rollback if:
if [ "$(error_rate)" > "1" ] || [ "$(p95_latency)" > "2000" ]
then
  curl -X POST http://localhost:8001/api/v2/admin/rollback-to-v1 \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json"
fi

# Notify team immediately
# Investigate root cause
# Plan retry for next day
```

### 5. Steady State (T+24h to T+7d)
```bash
# Daily health check:
pnpm validate:no-regression:local  # Should still show <5% delta
pnpm perf:baseline:local            # Should meet targets

# Weekly:
- [ ] Error rate remains <0.1%
- [ ] No customer complaints
- [ ] All integrations working
- [ ] Ready to deprecate v1
```

---

## Phase 4: Deprecation (Week 4+)

### 1. Complete v1 Deprecation
```bash
# Only after 7 days of v2 primary with no issues
curl -X POST http://localhost:8001/api/v2/admin/complete-v1-deprecation \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json"

# Expected response:
{
  "message": "v1 marked as deprecated",
  "status": {
    "v1_deprecated": true,
    "v1_endpoints": "returning 410 Gone"
  }
}
```

### 2. Cleanup Code
```bash
# Week 5+ (keep v1 running for 1 more week as safety net)
# Then remove from codebase:
git rm -r apps/api           # Remove Python backend
git rm -r apps/web           # Remove old Next.js web
git rm -r frontend/          # Remove old frontend
git commit -m "chore: remove deprecated v1 code after successful v2 migration"
git push origin main
```

### 3. Update Documentation
```bash
# Mark as deprecated:
- apps/api/README.md:       "❌ DEPRECATED - v1 removed in favor of apps/api-ts"
- frontend/README.md:       "❌ DEPRECATED - Use apps/mobile instead"
- apps/web/README.md:       "❌ DEPRECATED - Use apps/mobile instead"

# Or just delete files in cleanup step
```

### 4. Infrastructure Cleanup
```bash
# Update Docker Compose (remove Python services)
# Update Kubernetes deployment (remove old backend)
# Update CI/CD (stop Python tests, keep only TS)
# Stop Python dependency scanning
```

---

## Troubleshooting

### v2 API not responding
```bash
# Check if v2 is enabled
curl http://localhost:8001/api/v2/admin/flags | jq '.flags.v2_enabled'

# If false, enable it:
curl -X POST http://localhost:8001/api/v2/admin/flags \
  -H "Content-Type: application/json" \
  -d '{"v2_enabled": true}'

# Check server health
curl http://localhost:8001/api/v2/health

# Check logs
docker logs cohortlens-api-ts --tail 50
```

### High error rate on predictions
```bash
# Check if it's rule-based (v2) vs model-based (v1):
# v2 uses deterministic rules, so errors are usually:
# - Invalid input parameters
# - Database connection issues
# - Cluster assignment logic errors

# Inspect prediction request:
curl -X POST http://localhost:8001/api/v2/predict \
  -H "Content-Type: application/json" \
  -d '{"features": {"age": 25, "segment": "new"}}'

# Check Prisma connection:
docker exec cohortlens-postgres psql -U cohort_lens_user -d cohortlens -c "SELECT 1"
```

### Latency spike after cutover
```bash
# Check database query performance:
docker exec cohortlens-postgres psql -U cohort_lens_user -d cohortlens -c \
  "EXPLAIN ANALYZE SELECT * FROM prediction ORDER BY created_at DESC LIMIT 100"

# Check Neon connection pool (if using serverless):
# In Neon dashboard: check "Active connections" metric

# Solution options:
# 1. Add database indexes
# 2. Scale NestJS replicas horizontally
# 3. Reduce query scope (add pagination)
# 4. Cache predictions in Redis

git log --oneline | grep -i perf  # Check what changed recently
```

### Mobile app shows "Unauthorized" after cutover
```bash
# Check JWT secret mismatch
# v1 and v2 must use SAME JWT secret:

# Check v1 env:
echo $JWT_SECRET  # In apps/api/.env

# Check v2 env:
echo $JWT_SECRET  # In apps/api-ts/.env

# If different, update v2 to match v1:
# apps/api-ts/.env:
JWT_SECRET=your-secret-from-v1

# Restart v2:
npm run start:dev

# Test login on mobile
```

---

## Automation Scripts

### Auto-validate no regressions
```bash
#!/bin/bash
# Place in scripts/validate-daily.sh

while true; do
  echo "Running no-regression validation..."
  pnpm validate:no-regression:local > /tmp/validation.log 2>&1
  
  if grep "Mean delta: [0-4]" /tmp/validation.log; then
    echo "✅ Validation passed"
  else
    echo "❌ Validation failed"
    echo "Notification: alert @devops 'Validation failed'"
  fi
  
  sleep 86400  # Run daily
done
```

### Auto-monitor shadow mode
```bash
#!/bin/bash
# Place in scripts/monitor-shadow.sh

while true; do
  ERROR_COUNT=$(docker logs cohortlens-api-ts --since 5m | grep -i error | wc -l)
  
  if [ $ERROR_COUNT -gt 50 ]; then
    echo "⚠️ High error rate in shadow mode: $ERROR_COUNT errors"
    # Notify team
  fi
  
  sleep 300  # Check every 5 minutes
done
```

---

## Key Contacts

- **Slack Channel**: #cohortlens-migration
- **On-Call Escalation**: @devops-lead (production issues)
- **Feature Flag Emergency**: Set V2_ENABLED=false (killswitch)

---

## Document History

| Date | Phase | Status |
|------|-------|--------|
| Feb 28 | 1 (Beta) | Started |
| Mar 6 | 2 (Shadow) | Pending |
| Mar 13 | 3 (Cutover) | Pending |
| Mar 20 | 4 (Deprecation) | Pending |
