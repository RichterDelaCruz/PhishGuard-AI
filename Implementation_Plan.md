# PhishGuard AI — Implementation Plan

## 1) Overview
PhishGuard AI is a phishing detection web application that analyzes emails and URLs to return a risk score, a classification (phishing/safe/suspicious), and highlighted indicators. Primary inference remains self-hosted for speed and cost control:
- Email model: DistilBERT (fine-tuned)
- URL model: XGBoost (heuristics)
- Optional augmentation: DeepSeek chat model to generate human-readable explanations, summaries, and recommended actions, controlled by a feature flag.

Target platforms:
- Frontend: Next.js 14 (TypeScript, TailwindCSS, Chart.js) on Vercel
- Backend: FastAPI (Python 3.11, SQLModel) on Railway
- Storage: PostgreSQL 15 (prod), SQLite (local MVP)
- Model artifacts: S3 (private) 

## 2) Assumptions, Constraints, Non‑Goals
- Assumptions
  - DeepSeek API access available; API key managed via environment variables.
  - S3 bucket (private) exists for models; network egress allowed from Railway.
  - Vercel and Railway environment variable management used; .env files not committed; .env.example maintained.
  - Email integration initially targets Gmail; Outlook follows later.
- Constraints
  - PII: All user-submitted content treated as sensitive; AES-256 at rest, TLS 1.3 in transit; no plaintext logs.
  - Data retention: 90 days for analyses table.
  - API SLA: p95 < 400ms for self-hosted inference path.
  - Max payloads: 2MB text; 10MB .eml upload.
  - CORS: Restrict to Vercel frontend domain.
  - Budget cap for DeepSeek augmentation: USD 250/month.
- Non-Goals (initial)
  - Replacing primary classifiers with external LLMs.
  - Multi-tenant enterprise RBAC and audit exports (future scope).

## 3) Risks & Mitigations
- DeepSeek cost/runaway usage → hard feature flag + monthly cap + per-request guardrails; staged rollout.
- Gmail API quotas/webhooks complexity → exponential backoff, retry queues, idempotent handlers; admin alerts.
- Model drift → weekly threat intel refresh; quarterly retraining; unit/acceptance tests on held-out sets.
- False positives/negatives → threshold tuning, human-readable rationale via DeepSeek to aid trust.
- PII and compliance → encrypted storage, minimal logging, redaction, secure secrets management.

## 4) Architecture & Config
- Central configuration
  - Backend env vars:
    - CORE: NODE_ENV/ENV, DATABASE_URL, STORAGE_S3_{KEY,SECRET,BUCKET,REGION}
    - SECURITY: JWT_SECRET, RATE_LIMIT=100/hour, PII_ENCRYPTION_KEY
    - CORS_ALLOWED_ORIGIN
    - MODELS: EMAIL_MODEL_PATH, URL_MODEL_PATH
    - DEEPSEEK: ENABLE_DEEPSEEK_AUGMENTATION=true|false, DEEPSEEK_API_KEY, DEEPSEEK_MODEL=deepseek-chat, DEEPSEEK_TIMEOUT_MS=10000, DEEPSEEK_BUDGET_CAP_USD_MONTH=250
    - GMAIL: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GMAIL_WEBHOOK_SECRET, GOOGLE_PROJECT_ID
- Feature flag
  - Single env toggle ENABLE_DEEPSEEK_AUGMENTATION to gate secondary call.
  - Fallback: if disabled or error/timeout → return primary model result only.

## 5) Data Model & Migrations
- users
  - id (UUID, PK, default gen_random_uuid())
  - email (unique, not null)
  - hashed_password (nullable until OAuth-only accounts)
  - provider ('password'|'google'|'github'), default 'password'
  - provider_id (nullable)
  - created_at, updated_at (timestamps)
- analyses
  - id (UUID, PK)
  - content_hash (char(64))
  - content_type (email|url)
  - risk_score (float)
  - classification (varchar)
  - user_id (FK users.id)
  - created_at (timestamptz default now())
- migrations: Alembic; generate baseline, add users and analyses.

## 6) Security
- Input sanitization, disallowed patterns, truncation to 5000 chars.
- JWT auth (30m expiry) introduced in Week 3; passlib for hashing.
- Rate limiting 100 req/hour per user/IP.
- Encryption: AES-256 at rest; TLS 1.3 in transit; secrets from platform env stores.
- No sensitive content in logs; structured logs with request IDs.

## 7) Phased Plan & Tasks

### Phase 1 — Core MVP (Week 1)
Deliverables
- FastAPI backend with /api/analyze (email only) using DistilBERT; SQLite for local storage.
- Next.js frontend with main analysis form (text+file upload) and basic result display.
- Preprocessing pipeline (cleaning, feature extraction for emails) and deterministic hashing for dedupe.
- .env.example files; initial project scaffolding and CI basics.

Tasks
1) Backend (Implementer A)
   - Scaffold FastAPI app, routers, pydantic schemas for AnalyzeRequest {content, type} and AnalyzeResponse.
   - Implement preprocess_email(input) with sanitization and truncation; unit tests.
   - Load DistilBERT model from local path; inference function; batch-safe; timeout guard.
   - Write /api/analyze (email only), return risk_score, classification, indicators.
   - Create SQLite DB; SQLModel models for analyses; persistence on success.
   - Add hashing (SHA-256) of content for deduplication; optional cache.
   - Add minimal logging (no PII) and request IDs.
2) Frontend (Implementer B)
   - Next.js 14 app with / page: TextAreaInput + FileUploader.
   - Call backend; show risk score + indicators; error states; loading.
   - Basic Tailwind styling.
3) DevEx (Implementer C)
   - .env.example (frontend/backend); README quickstart.
   - Basic CI (lint/test) and pre-commit hooks.

Acceptance Criteria
- POST /api/analyze with email text returns score within p95 < 400ms locally.
- UI submits and renders result; handles 4xx/5xx gracefully.

### Phase 2 — V1 Release (Week 2)
Deliverables
- URL analysis (XGBoost) with heuristics and 45+ features.
- Dashboard (/dashboard) with history, distribution, trends (Chart.js).
- Deploy: Railway backend + Postgres; Vercel frontend; CORS configured.
- Alembic baseline migrations applied to Postgres.
- DeepSeek augmentation code paths scaffolded behind feature flag (disabled by default).

Tasks
1) Backend (Implementer A)
   - Add preprocess_url and feature extraction; load XGBoost model.
   - Extend /api/analyze to support type=url; ensure latency target.
   - Add GET /api/history?limit&offset; pagination; SQLModel query; index on created_at.
   - Introduce Alembic; create users and analyses tables in Postgres.
   - CORS: allow only Vercel origin; enforce payload size limits.
   - Implement DeepSeek client module interface and budget tracker (disabled by flag).
2) Frontend (Implementer B)
   - Add /dashboard with AnalysisHistory and charts; filters by date/risk.
   - Improve error toasts; skeleton loading; mobile responsiveness.
3) DevOps (Implementer C)
   - Railway deploy; set DATABASE_URL; health checks.
   - Vercel deploy; set NEXT_PUBLIC_API_URL.
   - Secrets stored in platform env stores.

Acceptance Criteria
- URL analysis returns consistent results and p95 < 400ms self-hosted path.
- Dashboard shows last 50 analyses; pagination works.
- Prod deployments live with restricted CORS.

### Phase 3 — Production Ready (Week 3)
Deliverables
- Gmail integration with OAuth and push notifications → webhook → quarantine to SPAM when risk_score > 0.90.
- Authentication: email/password with passlib hashing; JWT 30m; rate limiting 100/hour.
- DeepSeek augmentation enabled in staging; optional in prod via flag; graceful fallback.
- Observability: Railway metrics, error rate and latency alerts; Vercel Analytics for frontend.
- PII encryption at rest; data retention job (delete analyses > 90 days).

Tasks
1) Backend (Implementer A)
   - Auth endpoints: register/login; password hashing (passlib); JWT issuance/verification.
   - Rate limiting middleware (per user/IP); 429 handling.
   - Gmail OAuth flow; store tokens securely; refresh flow.
   - Push notification handler (Google Pub/Sub style webhook); idempotent processing.
   - Quarantine action via Gmail API when threshold exceeded; audit log entry.
   - DeepSeek augmentation call: when flag true, run after primary inference; include explanation, summary, recommended action; timeout and error fallback.
   - Data retention scheduled job (daily) to purge old analyses.
2) Frontend (Implementer B)
   - /integrate: OAuthConnect flow; state handling.
   - /settings: thresholds, notifications, API keys manager (scaffold).
   - Surface DeepSeek explanation in results when present.
3) DevOps/Observability (Implementer C)
   - Configure Railway alerts for high 5xx or p95 latency.
   - Secure secret storage; rotate keys policy; audit.

Acceptance Criteria
- End-to-end Gmail webhook to quarantine flow works in staging.
- DeepSeek path returns within timeout or falls back without degrading core SLA.
- Auth + rate limiting enforced; basic penetration checks pass.

### Phase 4 — Optimization (Week 4)
Deliverables
- Model quantization for DistilBERT; batch inference optimization.
- Response caching for repeated content; configurable TTL.
- Weekly threat intel ingestion (OpenPhish/PhishTank); retraining plan; URL feature augmentation.
- Anomaly detection monitoring for traffic spikes and error anomalies.

Tasks
1) Backend/ML (Implementer A)
   - Quantize DistilBERT (e.g., int8) and benchmark latency/accuracy trade-offs.
   - Caching layer (e.g., Redis on Railway add-on) keyed by content_hash + type.
   - Threat intel ingestion job (weekly); merge into blocklists/features.
   - Draft quarterly retraining pipeline outline.
2) Observability (Implementer C)
   - Add anomaly alerts; dashboards for latency, error, cache hit rate.

Acceptance Criteria
- p95 latency improved vs Week 2 baseline; cache hit rate tracked; quantization maintains acceptable accuracy.
- Weekly feeds successfully update heuristics; job is idempotent and observable.

## 8) Task Assignment & Roles
- Implementer A (Backend/ML)
- Implementer B (Frontend)
- Implementer C (DevOps/Observability)

Guiding Notes
- Use structured logs; include request_id; no PII in logs.
- Unit/integration tests for critical paths (preprocess, inference, rate limiting, auth, Gmail webhook).
- For DeepSeek calls, capture token usage and latency metrics (when enabled) and enforce per-request timeout.

## 9) Memory Bank Setup Note
Following the APM Memory Bank Guide and given moderate scope and limited agent count, adopt a single-file Memory Bank:
- File: `Memory_Bank.md` at repo root
- All future logs must follow the format in `prompts/02_Utility_Prompts_And_Format_Definitions/Memory_Bank_Log_Format.md`.

## 10) Acceptance & Go/No-Go Gates
- Phase completion requires meeting Acceptance Criteria above and no critical P0 bugs.
- Before enabling DeepSeek in production, validate cost telemetry, error rates, and budget cap behavior in staging.

## 11) Next Steps
- Create Memory_Bank.md and initialize header.
- Prepare first Task Assignment Prompts per Phase 1 tasks after user confirmation of this plan.
