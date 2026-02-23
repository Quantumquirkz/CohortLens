# CohortLens CRM + AI + Web3/Blockchain Roadmap

## 1) Executive framing

### 1.1 Project context
CohortLens is a **professional SaaS CRM analytics platform** with:
- AI capabilities (segmentation, spending prediction, SHAP explainability, and natural-language recommendations via Groq).
- Existing Web3 primitives (consent registry module, IPFS client, token reward placeholders).
- Multi-tenant and plan/usage infrastructure suitable for production monetization.

Because this is a professional context, the roadmap prioritizes:
1. Compliance and privacy by design.
2. Production robustness and observability.
3. Incremental rollout with controlled blast radius.
4. Enterprise-ready trust/provenance features.

### 1.2 Strategic objective
Transform CohortLens into a **Trustworthy AI CRM Platform** where:
- AI decisions are permission-aware (consent policy enforced).
- Analytics artifacts are verifiable (provenance + immutable references).
- Data contributors can be incentivized (tokenized rewards), with strong governance and legal guardrails.

---

## 2) Current-state baseline (what already exists)

### 2.1 AI baseline
- REST endpoints for prediction, segmentation, recommendations, drift, SHAP explanations.
- RAG/recommendation flow with Groq and fallback behavior.
- Report generation pipeline with optional IPFS upload flag.

### 2.2 Web3 baseline
- Consent registration/status retrieval modules and API routes.
- IPFS upload utility and CID persistence helper.
- Token reward computation scaffold (placeholder for future chain integration).

### 2.3 SaaS/ops baseline
- Auth, usage limiting, subscription integration hooks.
- Audit log functionality already available.

This baseline enables low-risk incremental upgrades rather than a full rewrite.

---

## 3) Guiding architecture principles

1. **Policy-first AI**: data usage policy is evaluated before every inference/report action.
2. **Off-chain compute, on-chain proof**: keep analytics and ML inference off-chain; anchor hashes/proofs on-chain only when needed.
3. **PII minimization**: never put raw personal data on public chains.
4. **Fail-safe defaults**: if consent/policy cannot be evaluated, deny sensitive action.
5. **Idempotent eventing**: all compliance/provenance writes are idempotent and replay-safe.
6. **Progressive decentralization**: start with DB + IPFS; add smart contracts after product-market validation.
7. **Tenant isolation**: all provenance, consent, and token ledgers are tenant-scoped.

---

## 4) Delivery plan overview (16-week reference)

- **Phase 0 (Week 0-1)**: Discovery, policy modeling, architecture hardening.
- **Phase 1 (Week 2-5)**: Consent-aware AI enforcement and compliance logging.
- **Phase 2 (Week 6-9)**: Verifiable reports and model/data provenance via IPFS.
- **Phase 3 (Week 10-13)**: Token rewards MVP (off-chain ledger + wallet mapping).
- **Phase 4 (Week 14-16)**: Optional on-chain anchoring and enterprise rollout controls.

Each phase ships independently with measurable business outcomes.

---

## 5) Phase 0 — Foundation and policy design (Week 0-1)

## 5.1 Deliverables
1. Consent taxonomy and policy matrix approved by product/legal/security.
2. Data classification model (PII, sensitive, derived, anonymous aggregates).
3. Architecture decision records (ADR) for provenance and tokenization.
4. Rollout strategy (feature flags, tenant cohorts, rollback procedures).

## 5.2 Detailed tasks

### Task A: Define a canonical consent model
- Consent dimensions:
  - `analytics`
  - `marketing`
  - `data_share`
  - optional `ai_training`
- Status model:
  - `granted | revoked | expired | unknown`
- Add temporal semantics:
  - `issued_at`, `effective_from`, `expires_at`, `revoked_at`

### Task B: Build a policy decision matrix
Create a matrix mapping endpoint/action to required consent set.

Example:
- `/predict-spending`: requires `analytics=granted`
- `/segment`: requires `analytics=granted`
- `/recommendations/natural`: requires `analytics=granted`; if recommendation type is campaign-related, also `marketing=granted`
- `/reports/generate` with external sharing: requires `data_share=granted`

### Task C: Threat modeling and misuse analysis
- Attack surfaces:
  - bypassing consent checks
  - replaying stale consent states
  - forging provenance entries
  - prompt leakage in recommendation contexts
- Controls:
  - server-side enforcement only
  - signed internal events
  - strict RBAC for admin/audit endpoints

### Task D: Define KPIs baseline
- Compliance KPIs:
  - `% AI calls with valid consent snapshot`
  - `# blocked requests by policy`
- Product KPIs:
  - conversion impact from policy prompts
  - recommendation acceptance rate
- Trust KPIs:
  - `% reports with provenance hashes`

## 5.3 Exit criteria
- Policy matrix approved.
- Backlog tickets broken down by endpoint/module.
- Monitoring dashboard skeleton defined.

---

## 6) Phase 1 — Consent-aware AI enforcement (Week 2-5)

## 6.1 Objective
Enforce consent policy before all AI operations and persist auditable policy decisions.

## 6.2 Backend implementation plan

### Step 1: Create policy engine module
Add a dedicated service layer (example module):
- `cohort_lens/compliance/policy_engine.py`

Core responsibilities:
1. Input: `tenant_id`, `customer_id(s)`, `action`, optional `purpose`.
2. Read latest consent state(s).
3. Evaluate against policy matrix.
4. Return structured decision:
   - `allowed: bool`
   - `reasons: list[str]`
   - `policy_version: str`
   - `consent_snapshot_id: str`

### Step 2: Add schema changes (Neon/PostgreSQL)
Introduce (or evolve) tables:

1. `consent_events`
- `id`, `tenant_id`, `customer_id`, `consent_type`, `status`, `effective_from`, `expires_at`, `source`, `vc_id`, `created_at`

2. `policy_decisions`
- `id`, `tenant_id`, `action`, `customer_scope_hash`, `allowed`, `reasons_json`, `policy_version`, `consent_snapshot_hash`, `request_id`, `created_at`

3. `model_inference_audit` (if needed)
- `id`, `tenant_id`, `endpoint`, `model_version`, `input_hash`, `output_hash`, `decision_id`, `created_at`

Migration requirements:
- Backward compatible, additive-only first.
- Include indexes on `(tenant_id, customer_id, consent_type, created_at DESC)`.

### Step 3: Endpoint-level enforcement
Apply policy checks for:
- prediction endpoints
- segmentation endpoint
- natural recommendation endpoint
- report generation endpoint

Implementation pattern:
1. Extract `tenant_id` from auth context.
2. Resolve customer IDs from request payload (single or batch).
3. Evaluate policy through policy engine.
4. If denied → `403` with machine-readable reason code.
5. Persist decision for every request (allow/deny).

### Step 4: Compliance-focused error model
Standardize denial payloads:
```json
{
  "error": "policy_denied",
  "reason_codes": ["CONSENT_ANALYTICS_MISSING"],
  "policy_version": "2026-01",
  "remediation": "Request analytics consent from customer"
}
```

### Step 5: Frontend UX updates
- On 403 policy denial:
  - show clear non-technical message
  - offer CTA to consent workflow
- Add “Consent health” badges in dashboard:
  - `compliant`, `partial`, `blocked`

## 6.3 Testing strategy

### Unit tests
- Policy engine rule evaluation.
- Edge cases: expired consent, revoked consent, mixed batch inputs.

### Integration tests
- API endpoints reject requests without valid consent.
- Audit records created for both allowed and denied calls.

### Security tests
- Attempt to bypass frontend and call APIs directly.
- Verify enforcement remains server-side.

## 6.4 Monitoring and SLOs
- Metrics:
  - `policy_eval_latency_ms`
  - `policy_denials_total`
  - `consent_lookup_failures_total`
- SLO target: `p95 policy evaluation < 50ms`.

## 6.5 Exit criteria
- 100% AI endpoints gated by policy engine.
- Denial reasons observable in logs/metrics.
- Zero P1 regressions in existing AI workflows for compliant users.

---

## 7) Phase 2 — Verifiable outputs and provenance (Week 6-9)

## 7.1 Objective
Make reports and high-value AI outcomes cryptographically traceable and externally verifiable.

## 7.2 Provenance model
For each report/predictive artifact, compute:
1. `data_snapshot_hash` (canonicalized, anonymized dataset snapshot hash).
2. `feature_config_hash` (model/config params hash).
3. `model_artifact_hash` (model binary hash or version digest).
4. `output_hash` (final report or inference output digest).
5. optional `cid` (IPFS content identifier).

Create table `artifact_provenance`:
- `id`, `tenant_id`, `artifact_type`, `artifact_id`, `hash_bundle_json`, `ipfs_cid`, `signature`, `created_at`

## 7.3 Implementation steps

### Step 1: Canonicalization and hashing utilities
- Build deterministic serialization (sorted keys, normalized numeric precision).
- Use SHA-256 for content hashes.
- Ensure no raw PII enters hash bundle payload.

### Step 2: Integrate with report generation flow
On `/reports/generate`:
1. Generate report.
2. Compute hash bundle.
3. If `upload_to_ipfs=true`, upload and capture CID.
4. Save provenance record.
5. Log audit event linking report ID to provenance ID.

### Step 3: Add verification endpoint
`GET /api/v1/provenance/{artifact_id}/verify`
Returns:
- existence of provenance record
- hash consistency checks
- IPFS availability status

### Step 4: Frontend provenance panel
In reports UI:
- show hash bundle summary
- show CID with copy action
- show verification status chip (`verified | partial | unavailable`)

## 7.4 Security/compliance safeguards
- Never upload sensitive raw records to IPFS.
- Use encrypted storage for local artifacts pre-upload.
- Access control for provenance endpoints by tenant.

## 7.5 Exit criteria
- ≥80% generated reports include provenance records.
- Verification endpoint returns deterministic results.
- Enterprise demo: prove report integrity from CID + hash bundle.

---

## 8) Phase 3 — Token rewards MVP (Week 10-13)

## 8.1 Objective
Launch an incentive system for compliant data contribution without introducing full on-chain complexity yet.

## 8.2 Product design scope
- Reward-eligible events:
  - consent granted
  - high-quality profile updates
  - data-sharing opt-in for specific programs
- Non-transferable points first (off-chain), tokenized later.

## 8.3 Data model
Add tables:
1. `wallet_identities`
- `id`, `tenant_id`, `customer_id`, `wallet_address`, `network`, `verified_at`, `status`

2. `reward_events`
- `id`, `tenant_id`, `customer_id`, `event_type`, `event_payload_hash`, `points`, `status`, `created_at`

3. `reward_balances`
- `tenant_id`, `customer_id`, `balance_points`, `updated_at`

## 8.4 Implementation steps

### Step 1: Event-driven reward calculator
- Convert `compute_reward_tokens` placeholder into deterministic engine.
- Include anti-abuse controls:
  - daily caps
  - duplicate event suppression
  - anomaly checks

### Step 2: Wallet linking flow (optional in MVP)
- User proves wallet ownership (message signing).
- Store only verified wallet address and chain metadata.

### Step 3: Admin controls
- tenant-level toggles for reward programs.
- policy-compatible rewards only (no rewards for non-consented actions).

### Step 4: Dashboard exposure
- Show user reward history and current balance.
- Explain why points were earned or denied (transparency).

## 8.5 Fraud and risk controls
- Risk engine flags suspicious burst events.
- Manual review queue for large reward accruals.
- Immutable audit trail for all reward mutations.

## 8.6 Exit criteria
- Reward events processed idempotently.
- No double-credit in replay scenarios.
- Program can be enabled per tenant without code changes.

---

## 9) Phase 4 — Optional on-chain anchoring and scale-out (Week 14-16)

## 9.1 Objective
Add selective blockchain anchoring for proof and interoperability after validating business value.

## 9.2 Smart contract scope (minimal viable)

Contract A: `ConsentProofRegistry`
- Stores hashed consent attestations (not PII).
- Functions:
  - `recordConsentProof(bytes32 proofHash, bytes32 subjectRef)`
  - `revokeConsentProof(bytes32 proofHash)`

Contract B: `ProvenanceAnchor`
- Stores report/inference provenance root hash.
- Function:
  - `anchorArtifact(bytes32 artifactRootHash, string cid)`

Contract C (optional later): `RewardToken`
- ERC-20/1155 depending on transferability model.

## 9.3 Rollout strategy
- Start with one L2 (e.g., Polygon).
- Batch anchors every N minutes to reduce fees.
- Maintain off-chain source-of-truth for operations; chain is proof layer.

## 9.4 Operational controls
- Key management via cloud KMS/HSM.
- Multi-sig governance for contract admin actions.
- Emergency pause procedures documented and tested.

## 9.5 Exit criteria
- Successful anchor transactions in staging and production pilot.
- Cost-per-anchor remains within target budget.
- Legal sign-off for public proof disclosures.

---

## 10) Cross-cutting workstreams (run in parallel)

## 10.1 Data protection and privacy
- DPIA/PIA documentation before full rollout.
- Regional compliance mapping (GDPR/CCPA/LPDP equivalents).
- Data retention and deletion guarantees.

## 10.2 DevSecOps and platform
- Add CI checks:
  - migration validation
  - policy-engine unit/integration test suites
  - secret scanning
- Runtime hardening:
  - strict env var management
  - signed build artifacts
  - dependency vulnerability scanning

## 10.3 Observability
- Dashboards for:
  - policy denials
  - provenance generation rates
  - IPFS success/failure ratio
  - reward event processing lag
- Alerting thresholds with on-call runbooks.

## 10.4 Performance optimization
- Cache consent lookups with short TTL and explicit invalidation on consent change.
- Async job queue for heavy report/provenance workloads.
- Batch DB writes for reward events and analytics audit entries.

## 10.5 Documentation and enablement
- API docs for new policy/provenance/rewards endpoints.
- Tenant admin playbooks.
- Internal training for support and sales engineering teams.

---

## 11) Detailed backlog template (per feature)

For each feature ticket include:
1. Business goal.
2. Endpoint/module impact.
3. Schema migration impact.
4. Security/privacy checklist.
5. Test cases (unit/integration/e2e).
6. Observability additions.
7. Rollback strategy.
8. Release notes impact.

This ensures predictable delivery across backend, frontend, and ops.

---

## 12) Recommended API additions (incremental)

1. `POST /api/v1/policy/evaluate` (internal/admin diagnostic)
2. `GET /api/v1/policy/decisions` (auditable trace, tenant-scoped)
3. `GET /api/v1/provenance/{artifact_id}`
4. `GET /api/v1/provenance/{artifact_id}/verify`
5. `POST /api/v1/rewards/claim` (MVP internal)
6. `GET /api/v1/rewards/balance/{customer_id}`
7. `GET /api/v1/rewards/history/{customer_id}`

All endpoints should be versioned and guarded by auth + tenant checks.

---

## 13) Testing roadmap (quality gates by phase)

## 13.1 Phase gate A (after Phase 1)
- 90%+ branch coverage in policy engine.
- E2E tests confirming denial/allow behavior.
- Security regression tests for unauthorized access.

## 13.2 Phase gate B (after Phase 2)
- Deterministic hash verification across environments.
- IPFS integration tests with retry/error handling.
- Provenance integrity tests with tampered artifacts.

## 13.3 Phase gate C (after Phase 3)
- Idempotency tests for repeated reward events.
- Concurrency tests under high event throughput.
- Abuse simulation tests (fraud patterns).

## 13.4 Phase gate D (after Phase 4)
- Smart contract unit and integration tests.
- Gas-cost baseline checks.
- Incident drill for key compromise and emergency pause.

---

## 14) Deployment blueprint

## 14.1 Environments
- `dev` -> `staging` -> `pilot-prod` -> `full-prod`.
- Feature flags per tenant and per endpoint capability.

## 14.2 Release strategy
- Blue/green or canary rollout for policy enforcement.
- Start with monitor-only mode:
  - evaluate policies and log, but do not block.
- Move to enforce mode after confidence threshold.

## 14.3 Rollback plan
- Feature-flag disable for policy/provenance/rewards modules.
- DB migrations must support safe rollback or forward-fix.
- Emergency bypass only for non-compliance-impacting features.

---

## 15) Governance and operating model

## 15.1 Ownership model
- Product owner: defines policy and incentives.
- Platform/backend lead: enforces architecture and reliability.
- Security/compliance lead: approves data handling and audits.
- Data science lead: model governance and explainability controls.

## 15.2 Change governance
- Any policy changes require:
  - version bump
  - changelog entry
  - approval workflow
  - backward compatibility review

## 15.3 Ethics and compliance checklist
- No coercive consent patterns.
- Transparent explanations for denied actions and reward eligibility.
- Human override and support pathways for disputes.

---

## 16) KPI targets (first 2 quarters)

1. `>95%` AI calls evaluated by policy engine.
2. `<1%` policy false-denial rate after stabilization.
3. `>85%` strategic reports with provenance records.
4. `<2s` p95 additional latency for report + provenance pipeline.
5. `>30%` eligible users enrolling in rewards pilot (if enabled).

---

## 17) Immediate next 10 actions (practical checklist)

1. Approve consent taxonomy and endpoint policy matrix.
2. Implement policy engine module and decision schema.
3. Add enforce/monitor feature flag.
4. Wire policy checks into prediction/segment/recommendation/report endpoints.
5. Add structured denial responses and UI handling.
6. Implement provenance hash utility and DB table.
7. Integrate provenance in report generation flow.
8. Add provenance verification endpoint + UI panel.
9. Build off-chain reward event pipeline with idempotency.
10. Launch tenant-limited pilot with dashboards and runbooks.

---

## 18) Final recommendation

Use a **compliance-first sequence**:
1. Consent-aware AI (mandatory foundation).
2. Provenance + IPFS verification (trust differentiator).
3. Off-chain rewards (engagement and retention).
4. Selective on-chain anchoring (enterprise proof/interoperability).

This path maximizes business value while controlling legal, technical, and operational risk.
