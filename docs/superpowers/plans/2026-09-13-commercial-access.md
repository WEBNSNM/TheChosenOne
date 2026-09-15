# Commercial Access and Growth Insight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a secure manual-issued redemption-code entitlement and convert the public experience into a compliant personal-growth insight service.

**Architecture:** Cloudflare Worker owns code redemption, cookie sessions, quota reservation/consumption, fixed report prompts, and output checks. Vue renders an authorization gate, entitlement status, structured context form, and admin code management. Existing private lottery/chart code remains available only behind an explicit commercial-mode boundary.

**Tech Stack:** Vue 3 + TypeScript, Cloudflare Workers, D1/SQLite migrations, Web Crypto AES-GCM/HMAC, Vitest, built-in image generation.

---

### Task 1: Add access-code storage and domain helpers

**Files:**
- Create: `migrations/0004_access_codes.sql`
- Create: `src/domain/access.ts`
- Test: `tests/domain/access.test.ts`

- [ ] **Step 1: Write failing domain tests** for normalized code format, keyed hash determinism, seven-day expiry, status transitions, and quota rules (`reserved` does not consume; `consumed` increments; `released` restores availability).
- [ ] **Step 2: Run `npm test -- tests/domain/access.test.ts` and verify the new tests fail.**
- [ ] **Step 3: Implement pure helpers** for `ACCESS_MAX_USES = 10`, `ACCESS_VALID_DAYS = 7`, code normalization, status derivation, expiry calculation, and idempotency validation. Keep crypto adapters injectable so tests do not depend on Worker globals.
- [ ] **Step 4: Add D1 tables and indexes** for `access_codes`, `access_sessions`, and `access_usage_logs`; include unique `code_hash`, encrypted code, suffix, quota, timestamps, order reference, and revoke fields.
- [ ] **Step 5: Run the focused test and migration SQL lint/readback; commit** `feat: add access entitlement schema`.

### Task 2: Implement Worker redemption, session, and quota APIs

**Files:**
- Modify: `server/app.ts`
- Modify: `src/domain/backendClient.ts`
- Test: `tests/server/api.test.ts`

- [ ] **Step 1: Add failing API tests** for batch creation auth, first redemption, second-browser rejection, `/api/access/me`, logout, expired/exhausted/disabled responses, concurrent quota boundary, successful consume, failed release, and idempotent retry.
- [ ] **Step 2: Run the focused server tests and verify failure.**
- [ ] **Step 3: Add routes** `POST /api/access/redeem`, `GET /api/access/me`, `POST /api/access/logout`, `POST /api/reports/generate`, `POST /api/admin/access-codes/batches`, `GET /api/admin/access-codes`, and `PATCH /api/admin/access-codes/:id`.
- [ ] **Step 4: Implement code generation** using cryptographically random uppercase groups, HMAC/SHA-256 lookup hash, AES-GCM encrypted full code, suffix display, and no plaintext logging. Batch sizes accept only 10, 50, or 100.
- [ ] **Step 5: Implement secure cookie sessions** with hashed token storage, `HttpOnly`, `Secure`, `SameSite=Lax`, expiry aligned to entitlement, revocation, and one active browser binding per code.
- [ ] **Step 6: Implement atomic reservation protocol** with D1 conditional updates/transactions, idempotency keys, consumed/released status, stale reservation cleanup, and generic public errors.
- [ ] **Step 7: Run API tests and commit** `feat: add redemption and quota APIs`.

### Task 3: Add commercial frontend access gate

**Files:**
- Modify: `src/App.vue`
- Create: `src/components/AccessGate.vue`
- Create: `src/components/EntitlementStatus.vue`
- Modify: `src/domain/backendClient.ts`
- Test: `tests/components/accessGate.test.ts`

- [ ] **Step 1: Write failing component tests** for unauthenticated gate, invalid-code error, authorized status, expiry/quota lock, logout, and refresh restoration.
- [ ] **Step 2: Run focused component tests and verify failure.**
- [ ] **Step 3: Add client API types/functions** for redeem, current entitlement, logout, and report generation; rely on cookies (`credentials: 'include'`) and never store raw codes in localStorage.
- [ ] **Step 4: Mount `AccessGate` before the workspace** in commercial mode; show product copy, code input, entitlement label, required notice, and support path. Render the existing workspace only after `/api/access/me` succeeds.
- [ ] **Step 5: Add persistent entitlement status** to the authorized header and terminal states for expired/exhausted/disabled access.
- [ ] **Step 6: Run component tests and commit** `feat: gate commercial workspace by entitlement`.

### Task 4: Convert report generation and user-facing copy

**Files:**
- Modify: `src/domain/consultation.ts`
- Modify: `src/domain/premiumReport.ts`
- Modify: `src/components/ConsultationHub.vue`
- Modify: `src/components/ConsultationPage.vue`
- Modify: `src/components/FortuneForm.vue`
- Modify: `src/components/ChartSetupModal.vue`
- Modify: `src/components/LeadPage.vue`
- Modify: `src/components/FortuneBoard.vue`
- Modify: `src/components/DailyFortuneCard.vue`
- Modify: `src/components/SharePosterCard.vue`
- Modify: `src/App.vue`
- Modify: `index.html`
- Test: `tests/contentSafety.test.ts`, `tests/domain/consultation.test.ts`

- [ ] **Step 1: Add failing safety tests** for public commercial copy and prompt output: no lottery/winning/betting/fortune prediction claims; required disclaimer present; report labels use `个人成长洞察`, `能力倾向`, `阶段观察`, and `行动建议`.
- [ ] **Step 2: Run safety tests and verify failure against current wording.**
- [ ] **Step 3: Replace public labels** such as `命盘` with `成长档案`, `吉凶` with `状态参考`, `宜忌` with `建议尝试/建议谨慎`, and `深度命盘报告` with `个人成长洞察报告`; remove numbers and screenshot-reading from commercial navigation.
- [ ] **Step 4: Add occupation, focus, goal, and current-difficulty fields** and make them required for the premium report path; retain birth date/time as an optional traditional-calendar context input with neutral labeling.
- [ ] **Step 5: Move system prompt ownership to Worker** and constrain report input to structured JSON. Add uncertainty language, scenario planning, financial self-reflection guidance, and forbidden-content rewrite/check.
- [ ] **Step 6: Update tests, run all content/domain tests, and commit** `feat: reframe reports as growth insights`.

### Task 5: Add admin code-management UI

**Files:**
- Modify: `src/components/AdminApp.vue`
- Modify: `src/domain/backendClient.ts`
- Test: `tests/components/adminAccessCodes.test.ts`

- [ ] **Step 1: Write failing tests** for batch-size selection, generated-code list, copy/issue action, order reference, filters, disable, reset binding, and quota adjustment.
- [ ] **Step 2: Run focused tests and verify failure.**
- [ ] **Step 3: Add an `体验码管理` admin view** using existing admin auth and table patterns; reveal full code only for available/issued rows, show suffix/status/quota/dates, and mark issued with optional order reference.
- [ ] **Step 4: Add confirmed support actions** for disable, reset browser binding, and add quota; surface generic errors and refresh status after each mutation.
- [ ] **Step 5: Run admin tests and commit** `feat: add admin access code management`.

### Task 6: Create and persist the Xiaohongshu product image

**Files:**
- Create: `public/xiaohongshu-product-cover-c.png`
- Create: `public/xiaohongshu-thumbnail-c.png`
- Modify: `public/poster-export.html` only if the approved asset is embedded there.

- [ ] **Step 1: Generate a warm editorial product cover** using built-in image generation with exact copy: `理清当下，再决定下一步`, `个人成长洞察工具`, `能力倾向 · 阶段观察 · 事业与金钱行动建议`, `兑换即用 · 7 天 10 次`; prohibit mystical imagery, lottery balls, money piles, celestial charts, and watermarks.
- [ ] **Step 2: Inspect the generated image** for legibility and composition; perform one targeted regeneration if text or layout is incorrect.
- [ ] **Step 3: Copy the selected asset into `public/`** without overwriting existing assets, add an accessible reference in export markup if needed, and report the final paths.

### Task 7: Verification and release checks

**Files:**
- Modify: `tests/server/api.test.ts` if test doubles need transaction support.
- Modify: `DEPLOYMENT.md` with migration/deploy and manual-fallout instructions.

- [ ] **Step 1: Run `npm test` and fix all failures.**
- [ ] **Step 2: Run `npm run build` and fix TypeScript/Vite errors.**
- [ ] **Step 3: Apply local migration with `npm run db:migrate:local`; verify code generation, redemption, quota, expiry, and reset against local Worker.**
- [ ] **Step 4: Check production copy with `rg` for forbidden commercial wording and confirm excluded routes are hidden/blocked in commercial mode.**
- [ ] **Step 5: Run responsive browser smoke checks at desktop and mobile widths; verify gate, status, report submission, terminal states, and admin table. Commit** `test: verify commercial access flow`.

## Self-Review

- Schema, API, frontend gate, admin workflow, report safety, visual asset, deployment, and test requirements from the design spec each have a task above.
- No task relies on an unspecified helper; crypto, session, quota, prompt, and UI responsibilities are explicitly assigned.
- Seven-day timing starts on first redemption; batch creation and issue marking do not start the clock.
- Ten uses decrement only after successful generation; failures release reservations.
- Full codes are recoverable only through authenticated admin decryption; lookup uses a keyed digest.
- Commercial mode hides lottery and screenshot features while leaving private/test code intact.
