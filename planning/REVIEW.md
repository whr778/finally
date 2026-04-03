# FinAlly PLAN.md Comprehensive Review

## Scope
Reviewed `/planning/PLAN.md` for completeness, consistency, clarity, technical feasibility, and implementation risk. This review is findings-first (ordered by severity), with explicit fixes.

## Findings (Ordered by Severity)

### Critical

#### C1. Public, unauthenticated trading and AI-execution APIs conflict with cloud deployment guidance
- Category: Gaps/Risks, Technical Feasibility
- Evidence: `PLAN.md:15-16`, `PLAN.md:78`, `PLAN.md:250-279`, `PLAN.md:324-329`, `PLAN.md:421-423`
- Why this is a problem: The plan intentionally has no login/auth, but also describes optional deployment to public cloud platforms. In that state, anyone with network access can trigger trades, spam chat calls, and burn API budget.
- Recommendation: Explicitly split deployment modes.
1. `local_demo` mode: no auth, binds to localhost only, not internet-exposed.
2. `public_demo` mode: require at minimum API key auth or session auth, CORS/CSRF rules, and per-IP/per-session rate limits.
3. Add a hard warning in deployment docs: unauthenticated mode must not be internet-exposed.

#### C2. Monetary math uses floating-point (`REAL`) and risks incorrect balances/P&L
- Category: Consistency, Technical Feasibility
- Evidence: `PLAN.md:201`, `PLAN.md:215-216`, `PLAN.md:225-226`, `PLAN.md:232`
- Why this is a problem: Using binary floating-point for cash, average cost, trade price, and value introduces rounding drift and reconciliation errors.
- Recommendation: Define a deterministic numeric strategy.
1. Store money in integer minor units (e.g., cents) or fixed decimal (`NUMERIC`) with explicit precision.
2. Store share quantity in fixed precision (e.g., 4–6 decimals), with centralized rounding rules.
3. Add invariant tests: cash + market value matches ledger within exactly defined tolerance (or exact integer arithmetic).

#### C3. Watchlist ticker validation depends on Massive API even when simulator mode is selected
- Category: Completeness, Feasibility, Consistency
- Evidence: `PLAN.md:137-138`, `PLAN.md:268`
- Why this is a problem: In default simulator mode (no `MASSIVE_API_KEY`), `POST /api/watchlist` still requires Massive-based validation, creating a hidden hard dependency and likely endpoint failure.
- Recommendation: Define source-aware validation.
1. In simulator mode, validate against supported simulated symbol universe (or permissive symbol regex + lazy price bootstrapping).
2. In Massive mode, validate via Massive endpoint with caching.
3. Document error response when validation provider is unavailable.

#### C4. LLM auto-execution lacks guardrails and bounded action policy
- Category: Gaps/Risks, Completeness
- Evidence: `PLAN.md:298-300`, `PLAN.md:324-329`, `PLAN.md:333-339`
- Why this is a problem: The assistant can execute trades/watchlist changes directly without limits, opening risk of runaway actions from prompt injection, malformed outputs, or repeated retries.
- Recommendation: Add explicit execution safety constraints.
1. Hard caps per chat turn (e.g., max N trades, max position delta, max notional).
2. Idempotency key for each chat action batch.
3. Strict schema validation + reject unknown fields.
4. Policy that only imperative user intent triggers execution; analysis-only prompts must not trade.

### High

#### H1. API contract is under-specified (request/response schemas, status codes, error model)
- Category: Clarity, Completeness
- Evidence: `PLAN.md:250-279`
- Why this is a problem: Endpoint list alone leaves implementers guessing field names, numeric formats, success/error envelopes, and edge-case status codes.
- Recommendation: Add an API contract section or OpenAPI-first appendix.
1. Define exact request/response JSON for each endpoint.
2. Define status codes and stable error schema (`code`, `message`, `details`, `request_id`).
3. Specify pagination/sorting/filtering for history endpoints.

#### H2. Trade execution semantics are ambiguous under stale/missing market data
- Category: Completeness, Clarity
- Evidence: `PLAN.md:27`, `PLAN.md:170-181`, `PLAN.md:261`
- Why this is a problem: “Instant fill at current price” is undefined if price cache is stale (especially Massive free-tier polling), ticker is missing, or feed is disconnected.
- Recommendation: Specify execution rules.
1. Define max staleness threshold (e.g., reject if last quote older than X seconds).
2. Define behavior for missing quotes, halted symbols, and disconnected feed.
3. Return explicit execution timestamp + quote timestamp in trade response.

#### H3. No explicit transaction/isolation strategy for concurrent trades
- Category: Technical Feasibility, Consistency
- Evidence: `PLAN.md:261`, `PLAN.md:298-299`
- Why this is a problem: Manual and AI-triggered trades can race, causing oversell/negative cash if updates are not atomic.
- Recommendation: Define atomic DB transaction behavior.
1. Single transaction: read position/cash, validate, insert trade, update position, update cash, write snapshot.
2. Use SQLite transaction mode (`BEGIN IMMEDIATE`) for write serialization.
3. Add concurrency tests for simultaneous buy/sell calls.

#### H4. Timezone and “market close” behavior are undefined, making snapshot retention ambiguous
- Category: Consistency, Clarity
- Evidence: `PLAN.md:229`, `PLAN.md:233`, `PLAN.md:356`
- Why this is a problem: “At market close” depends on market calendar/timezone/holidays; timestamps are ISO strings but UTC/local behavior is unspecified.
- Recommendation: Define temporal model.
1. Store timestamps in UTC ISO-8601 with `Z` suffix.
2. Define market calendar source and timezone (e.g., US equities, America/New_York).
3. Define weekend/holiday behavior and summarization scheduler timing.

#### H5. SSE design is incomplete for resiliency and future scale
- Category: Completeness, Feasibility
- Evidence: `PLAN.md:177-181`, `PLAN.md:173`
- Why this is a problem: Event format omits event IDs, retry interval, heartbeat strategy, and backpressure handling. Claiming future multi-user support “without changes” is optimistic for broadcast-all-tickers behavior.
- Recommendation: Expand streaming contract.
1. Define SSE fields: `id`, `event`, `data`, optional `retry`.
2. Add heartbeat events and idle timeout behavior.
3. Define server policy for slow clients and disconnect cleanup.
4. Reframe multi-user claim to “requires stream partitioning/filtering for scale.”

#### H6. External dependency failure strategy is missing (Massive/OpenRouter outages, 429s, timeouts)
- Category: Completeness, Risk
- Evidence: `PLAN.md:160-166`, `PLAN.md:285-300`
- Why this is a problem: Without retries, circuit breakers, and fallback behavior, partial outages will cause broken UX and flaky tests.
- Recommendation: Add dependency resilience policy.
1. Timeout/retry/backoff defaults per provider.
2. Distinct handling for 4xx vs 5xx vs timeout.
3. Graceful degradation: keep last known prices with staleness banner; chat returns actionable error without breaking app.

#### H7. Docker storage guidance is contradictory (named volume vs project `db/` bind mount)
- Category: Consistency, Clarity
- Evidence: `PLAN.md:101-102`, `PLAN.md:397-404`
- Why this is a problem: `-v finally-data:/app/db` is a named volume, but text says project-root `db/` maps to `/app/db` (bind mount). Teams may implement/test different persistence behavior.
- Recommendation: Pick one canonical approach and document alternatives explicitly.
1. Preferred dev command with bind mount: `-v $(pwd)/db:/app/db`.
2. Preferred production command with named volume.
3. Update scripts/docs so both paths are intentional and consistent.

### Medium

#### M1. Database constraints/indexes are insufficiently specified for data integrity
- Category: Completeness
- Evidence: `PLAN.md:199-241`
- Why this is a problem: Missing explicit `NOT NULL`, `CHECK` constraints, foreign keys, and indexes can permit invalid data and degrade query performance.
- Recommendation: Add DDL-level constraints.
1. `CHECK(quantity > 0)`, `CHECK(side IN ('buy','sell'))`, `CHECK(cash_balance >= 0)`.
2. Foreign keys from `user_id` to user table.
3. Indexes on `(user_id, ticker)`, time-series fields (`executed_at`, `recorded_at`).

#### M2. Schema naming and user model statements are inconsistent
- Category: Consistency
- Evidence: `PLAN.md:197`, `PLAN.md:199`
- Why this is a problem: Plan says “all tables include `user_id`,” but `users_profile` uses `id`; table naming (`users_profile`) is also atypical and may cause confusion.
- Recommendation: Normalize naming.
1. Rename to `user_profiles` or `users`.
2. Clarify that `users` table uses `id`; all child tables reference it via `user_id`.
3. Add naming convention section (snake_case, pluralization rules).

#### M3. Frontend state ownership and cache invalidation strategy are not defined
- Category: Completeness, Feasibility
- Evidence: `PLAN.md:354-371`
- Why this is a problem: Live prices + REST mutations + chart history can diverge without clear single-source-of-truth and invalidation policy.
- Recommendation: Specify state architecture.
1. Define what comes from SSE vs REST bootstrap.
2. Define optimistic vs server-authoritative updates for trades/watchlist.
3. Document reconnection/bootstrap flow after SSE drop.

#### M4. Accessibility requirements are missing
- Category: Gaps/Risks
- Evidence: `PLAN.md:33-44`, `PLAN.md:354-371`
- Why this is a problem: Dense dashboards often fail keyboard and screen-reader usage; flashing price effects may violate reduced-motion expectations.
- Recommendation: Add baseline a11y acceptance criteria.
1. Keyboard navigable controls and focus states.
2. ARIA labels for tables/charts/chat controls.
3. Respect `prefers-reduced-motion` for price flash animations.
4. Contrast ratio targets for dark theme.

#### M5. Browser/device compatibility targets are too vague
- Category: Clarity
- Evidence: `PLAN.md:39`, `PLAN.md:68`, `PLAN.md:178`
- Why this is a problem: “Works everywhere” and “functional on tablet” are not testable compatibility requirements.
- Recommendation: Define support matrix.
1. Explicit browser versions (Chrome, Edge, Firefox, Safari).
2. Minimum viewport breakpoints and non-goals (e.g., phone optional).
3. Known SSE limitations and fallback UX.

#### M6. Logging/monitoring/operability are not specified
- Category: Gaps/Risks
- Evidence: Entire plan has no observability section
- Why this is a problem: Debugging background tasks, SSE churn, and AI errors is difficult without structured logs and metrics.
- Recommendation: Add operability section.
1. Structured JSON logs with `request_id`, endpoint, latency, outcome.
2. Metrics counters (SSE clients, trade success/fail, provider errors).
3. Health endpoint semantics (`live` vs `ready` and dependency checks).

#### M7. Security hardening beyond auth is absent
- Category: Gaps/Risks
- Evidence: `PLAN.md:250-279`, `PLAN.md:393`
- Why this is a problem: Even in demo apps, missing basic controls can expose avoidable risk.
- Recommendation: Add minimum security baseline.
1. Input validation and ticker normalization.
2. Rate limiting for chat and trade endpoints.
3. Request size limits and chat message max length.
4. Optional security headers in FastAPI static serving.

#### M8. Testing strategy omits key failure-mode and non-functional tests
- Category: Completeness
- Evidence: `PLAN.md:431-457`
- Why this is a problem: Current tests focus happy-path product behavior and miss resilience/performance/security regressions.
- Recommendation: Expand test plan.
1. External API failure and retry behavior tests.
2. Concurrency tests for trade races.
3. Load tests for SSE fan-out and memory leak checks.
4. Accessibility smoke tests and API contract tests.

#### M9. Prompt/tooling instructions are mixed into product specification
- Category: Clarity, Consistency
- Evidence: `PLAN.md:285-287`, `PLAN.md:296`
- Why this is a problem: “Use cerebras-inference skill” and “There is an OPENROUTER_API_KEY in .env” are implementation-process artifacts and can become stale or unsafe in product docs.
- Recommendation: Separate documents.
1. Keep PLAN focused on product requirements and technical contract.
2. Move agent/tool-specific build instructions to `planning/IMPLEMENTATION_GUIDE.md`.
3. Replace hard-coded secret assumptions with env var contract only.

### Low

#### L1. Charting guidance is slightly inconsistent (“canvas-based” but includes Recharts)
- Category: Consistency
- Evidence: `PLAN.md:368`
- Why this is a problem: Recharts is primarily SVG-based, which conflicts with “canvas-based preferred for performance.”
- Recommendation: Clarify accepted libraries and rationale.
1. If performance-critical, prefer Lightweight Charts (canvas).
2. If using Recharts, define acceptable data size/performance thresholds.

#### L2. “Single Docker command opens browser” is aspirational but not universally true
- Category: Clarity
- Evidence: `PLAN.md:15`
- Why this is a problem: `docker run` itself does not open a browser cross-platform.
- Recommendation: Reword launch expectation.
1. “Start script may optionally open browser; otherwise print URL.”

## Cross-Cutting Completeness Gaps

1. No explicit error taxonomy shared across backend and frontend.
2. No idempotency strategy for user-initiated trade requests.
3. No data retention policy for `chat_messages` and `trades` growth.
4. No backup/restore guidance for persisted SQLite volume.
5. No explicit versioning strategy for API/schema evolution.

## Open Questions / Assumptions to Resolve

1. Is public internet deployment a hard requirement, or is this strictly a localhost capstone demo?
2. Should short selling be forbidden explicitly?
3. In simulator mode, can users add any syntactically valid ticker, or only a curated symbol list?
4. Is historical data required beyond same-session intraday charts?
5. Is a single-user-only guarantee acceptable for the entire capstone lifecycle?

## Recommended Next Revision Plan

1. Add `Non-Functional Requirements` section: security baseline, observability, performance targets, compatibility matrix.
2. Add `API Contract` appendix with canonical JSON schemas and error model.
3. Add `Execution & Consistency Rules` section for trading atomicity, rounding, stale quote handling, idempotency.
4. Add `Failure Mode Behavior` section for Massive/OpenRouter outages and degraded UX.
5. Add `Deployment Modes` section (`local_demo` vs `public_demo`) with explicit safeguards.

## Brief Strengths

1. Strong top-level scope and UX vision.
2. Good architectural simplification choices for a capstone (single container, SSE, simulator default).
3. Clear functional feature set and practical testing starter list.

