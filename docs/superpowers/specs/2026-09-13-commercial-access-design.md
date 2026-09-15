# Commercial Access and Growth Insight Design

## Purpose

Convert the existing personal-use application into a Xiaohongshu-sold digital service. A buyer receives a website URL and a unique redemption code after purchase. The code activates seven days of access and ten successful AI report generations in one browser.

The commercial product remains differentiated by using traditional calendar data as one reflective input, but it must not present divination, deterministic predictions, gambling guidance, or promised financial outcomes. Platform approval cannot be guaranteed; the design reduces obvious content and product risks rather than claiming legal or platform certification.

## Product Positioning

Public product name: `个人成长洞察工具`

Short offer:

> 结合个人信息与现实背景，整理能力倾向、阶段主题、事业与金钱行动建议。

The report uses two input layers:

1. Traditional calendar observations derived from birth date and time.
2. User-provided real-world context, including occupation, current focus, goals, and current difficulty.

Neither layer may be presented as scientific proof or a certain prediction. The report describes tendencies, possible scenarios, reflection questions, and practical actions.

## Commercial Scope

The commercial experience includes:

- Redemption and browser-bound access.
- A personal profile and context form.
- An AI-generated growth insight report.
- Clear remaining-use and expiry information.
- An admin interface for code generation and customer support.

The commercial experience excludes:

- Red/blue lottery-style number generation.
- Lottery, winning, betting, or wealth-prediction language.
- Birth-chart screenshot interpretation as a promoted or customer-facing feature.
- Deterministic good/bad scores, taboos, guaranteed events, or guaranteed returns.

The excluded features remain in the repository for the private/test mode and are hidden by a commercial-mode feature boundary. Commercial API routes must not expose them.

## User Experience

### Before Redemption

The first screen presents the product name, a concise description, the entitlement `7 天内可生成 10 次`, a redemption-code input, and the content-use notice. It does not show the report workspace before authorization.

### Redemption

The buyer enters a unique code. On the first successful redemption, the server:

1. Marks the code as redeemed.
2. Sets `redeemed_at` to the current time.
3. Sets `expires_at` to exactly seven 24-hour periods after redemption.
4. Creates a browser session and sends it in a secure, HTTP-only cookie.

Generating a code or marking it as issued does not start the seven-day period. An unredeemed code does not expire unless an administrator disables it.

### Authorized Use

The application header always shows remaining successful generations and the exact expiration time. The user fills in birth information and real-world context, chooses a focus, and requests a report.

One use is consumed only after a complete report has been generated successfully. A model error, network failure, timeout, or user cancellation does not consume a use.

### Entitlement End

When the code reaches zero remaining uses or passes its expiration time, report generation is blocked. The page explains the reason and directs the buyer back to the original store for a new entitlement. It does not promise that renewal changes any future outcome.

### Device Binding and Recovery

The first redemption is bound to the browser session, not to invasive device fingerprinting. Reusing the code in another browser is rejected. An administrator may revoke sessions and reset the binding after verifying the buyer's order information.

## Visual Direction

Use direction C, `温暖编辑风`:

- Warm editorial composition with restrained red accents and dark neutral text.
- Human, reflective tone with an obvious digital-tool identity.
- No celestial charts, talismans, fortune wheels, gambling balls, currency piles, or mystical portraits.
- Product thumbnails use one short headline, one supporting line, and a compact entitlement label.
- Cards use at most 8px corner radii; controls follow the existing Lucide icon system.

Primary thumbnail copy:

> 理清当下，再决定下一步

Supporting copy:

> 个人成长洞察工具
> 能力倾向 · 阶段观察 · 事业与金钱行动建议

Entitlement label:

> 兑换即用 · 7 天 10 次

## Data Model

### `access_codes`

- `id`: internal identifier.
- `code_hash`: deterministic keyed digest used for lookup and comparison.
- `encrypted_code`: AES-GCM encrypted full code so an authenticated administrator can copy an unused code later.
- `code_suffix`: final four characters for safe list display and support.
- `status`: `available`, `issued`, `active`, `exhausted`, `expired`, or `disabled`.
- `max_uses`: defaults to 10.
- `used_count`: successful generations consumed.
- `valid_days`: defaults to 7.
- `order_reference`: optional Xiaohongshu order reference.
- `issued_at`, `redeemed_at`, `expires_at`, `created_at`, `updated_at`.
- `note`: optional support note.

The encryption key uses the existing `CONFIG_ENCRYPTION_KEY` secret. Plain codes never appear in application logs. Admin list responses reveal the full decrypted code only for `available` or `issued` records and only to an authenticated administrator.

### `access_sessions`

- `id` and hashed session token.
- `access_code_id`.
- `revoked_at`, `last_seen_at`, `created_at`.

The raw session token exists only in the secure cookie. The session row permits immediate revocation and browser-binding reset.

### `access_usage_logs`

- `id` and idempotency key.
- `access_code_id` and `session_id`.
- `status`: `reserved`, `consumed`, or `released`.
- Model endpoint and timestamps.
- Sanitized failure category without prompt or personal profile content.

## API Design

Public access endpoints:

- `POST /api/access/redeem`: redeem a code and establish the cookie session.
- `GET /api/access/me`: return status, remaining uses, and expiration.
- `POST /api/access/logout`: revoke the current session and clear the cookie.

Commercial report endpoint:

- `POST /api/reports/generate`: accepts structured profile, birth inputs, focus, and user context. It does not accept arbitrary model messages or system prompts.

Admin endpoints:

- `POST /api/admin/access-codes/batches`: create 10, 50, or 100 codes.
- `GET /api/admin/access-codes`: filter and list codes.
- `PATCH /api/admin/access-codes/:id`: mark issued, attach an order reference, disable, reset binding, or adjust quota.

All admin endpoints use the existing admin authentication. All state-changing requests validate JSON shape, enforce size limits, and return generic public errors while recording sanitized server diagnostics.

## Quota Protocol

Before a model call, the server atomically verifies the session, expiry, disabled state, and remaining quota, then creates a reserved usage record. Concurrent requests cannot reserve beyond the maximum use count.

On successful model completion, the reservation becomes consumed and `used_count` increments atomically. On failure, timeout, or cancellation detected by the server, the reservation becomes released. An idempotency key prevents a retried browser request from consuming twice.

Old reservations are reconciled by a scheduled or request-triggered cleanup path so a worker interruption cannot permanently strand quota.

## Report Generation and Content Safety

The current client-built model prompts move to the Worker. The browser sends only structured product inputs. The Worker owns the system prompt, input normalization, quota handling, and output checks.

The system prompt positions the model as a personal growth reflection and action-planning assistant. It may translate internal calendar-derived signals into ordinary language but must:

- Use uncertainty-aware phrases such as `可能`, `倾向`, and `可以观察`.
- Ground suggestions in the user's stated job, focus, and difficulty.
- Present future content as scenarios and 30-day planning.
- Present money content as work habits, budgeting reflection, and career actions.
- Avoid guaranteed events, fixed personality claims, investment recommendations, medical/legal conclusions, relationship mind-reading, and all gambling content.

The commercial report does not display raw pillars, day master, hidden stems, deities, good/bad labels, or lucky numbers. A server-side output check detects high-risk phrases. When detected, the server makes one constrained rewrite attempt. If the rewrite still fails, it returns a neutral failure message without consuming quota.

Required notice:

> 内容由 AI 基于用户主动提供的信息生成，并参考传统历法文化视角，用于自我观察与行动整理；不代表对未来事件或收益的预测，不构成投资、医疗、法律等专业建议。

## Admin Experience

The existing admin application gains an `体验码管理` view. The primary workflow is:

1. Generate a batch.
2. Filter to available codes.
3. Copy one code and mark it issued with an optional order reference.
4. Search by order reference or code suffix for support.

Support actions require confirmation and are logged. Resetting a binding revokes all current sessions for that code. Disabling a code blocks new and existing sessions immediately.

## Error Handling

- Invalid code: generic invalid-code message without revealing whether a similar code exists.
- Already redeemed elsewhere: explain that the code is bound and provide the store support path.
- Expired or exhausted: return the exact reason and current entitlement state.
- Model failure: release the reservation and show a retry action.
- Cookie unavailable: explain that the browser must allow site cookies.
- Admin decryption failure: do not expose ciphertext; show a configuration error and keep the code disabled for copying.

## Testing

Domain and API tests cover:

- Batch generation uniqueness and secure storage.
- First redemption and exact seven-day expiration.
- Same-browser reuse and another-browser rejection.
- Disabled, expired, and exhausted codes.
- Concurrent generation requests at the quota boundary.
- Successful consumption, failure release, stale reservation recovery, and idempotent retry.
- Admin authorization, issue marking, session reset, quota adjustment, and code copying.
- Commercial mode removal of excluded routes and user-facing high-risk wording.
- Prompt construction and representative unsafe-output rejection or rewrite.

Frontend component tests cover the redemption gate, entitlement status, report form, terminal states, and admin code workflow. The final verification includes production build, full tests, and responsive browser screenshots.

## Rollout

1. Apply the D1 migration and deploy to a test Worker.
2. Generate test codes and verify redemption, expiry, quota, and reset behavior.
3. Enable commercial mode only on the sales domain.
4. Review product copy and generated sample reports before listing.
5. Generate the final Xiaohongshu thumbnail from the approved warm editorial direction.

The first release does not integrate Xiaohongshu order APIs. Manual code delivery is the intentional operational boundary. Automatic delivery can later attach an order webhook to the same `access_codes` model.
