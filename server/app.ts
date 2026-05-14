export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[] }>;
  run(): Promise<{ success: boolean }>;
}

export interface D1Database {
  prepare(sql: string): D1PreparedStatement;
}

export interface WorkerEnv {
  DB: D1Database;
  JWT_SECRET: string;
  CONFIG_ENCRYPTION_KEY: string;
}

type Handler = (context: RequestContext) => Promise<Response>;
type Route = {
  method: string;
  pattern: RegExp;
  handler: Handler;
  protected?: boolean;
};

interface RequestContext {
  request: Request;
  env: WorkerEnv;
  params: Record<string, string>;
  admin?: AdminSession;
}

interface AdminSession {
  username: string;
  role: string;
}

interface AiConfigRecord {
  provider: string;
  base_url: string;
  model: string;
  encrypted_api_key: string;
  updated_at: string;
}

interface AdminUserRecord {
  username: string;
  password_hash: string;
  role: string;
}

type AiMessage = {
  role?: unknown;
  content?: unknown;
};

const DEFAULT_AI_PROVIDER = 'deepseek';
const DEFAULT_AI_BASE_URL = 'https://api.deepseek.com/chat/completions';
const DEFAULT_AI_MODEL = 'deepseek-v4-flash';
const VISION_AI_PROVIDER = 'vision';
const DEFAULT_VISION_AI_BASE_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_VISION_AI_MODEL = 'vision-model';

export function createWorkerApp() {
  const routes: Route[] = [
    route('POST', /^\/api\/admin\/login$/, loginAdmin),
    route('GET', /^\/api\/admin\/users$/, listAdminUsers, true),
    route('DELETE', /^\/api\/admin\/users\/(?<clientId>[^/]+)$/, deleteAdminUser, true),
    route('GET', /^\/api\/admin\/ai-config$/, getAiConfig, true),
    route('PUT', /^\/api\/admin\/ai-config$/, saveAiConfig, true),
    route('GET', /^\/api\/admin\/payment-configs\/(?<provider>[^/]+)$/, getPaymentConfig, true),
    route('PUT', /^\/api\/admin\/payment-configs\/(?<provider>[^/]+)$/, savePaymentConfig, true),
    route('POST', /^\/api\/charts$/, saveChart),
    route('POST', /^\/api\/ai\/chat$/, proxyAiChat),
    route('POST', /^\/api\/payments\/orders$/, createPaymentOrder),
    route('POST', /^\/api\/payments\/webhook\/(?<provider>[^/]+)$/, recordPaymentWebhook),
  ];

  return {
    async fetch(request: Request, env: WorkerEnv): Promise<Response> {
      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders() });
      }

      const url = new URL(request.url);
      const match = routes
        .map((item) => ({ route: item, match: url.pathname.match(item.pattern) }))
        .find((item) => item.match && item.route.method === request.method);

      if (!match?.match) {
        return json({ error: 'Not found' }, 404);
      }

      const context: RequestContext = {
        request,
        env,
        params: match.match.groups ?? {},
      };

      if (match.route.protected) {
        const admin = await requireAdmin(request, env);
        if (!admin) return json({ error: 'Unauthorized' }, 401);
        context.admin = admin;
      }

      try {
        return await match.route.handler(context);
      } catch (error) {
        const message = error instanceof Error ? error.message : '服务器处理失败';
        return json({ error: message }, 500);
      }
    },
  };
}

export default createWorkerApp();

function route(method: string, pattern: RegExp, handler: Handler, protectedRoute = false): Route {
  return { method, pattern, handler, protected: protectedRoute };
}

async function loginAdmin({ request, env }: RequestContext): Promise<Response> {
  const body = await readJson<{ username?: string; password?: string }>(request);
  const username = normalizeText(body.username);
  const password = String(body.password ?? '');

  if (!username || !password) return json({ error: '请输入后台账号和密码' }, 400);

  const admin = await env.DB.prepare(
    'SELECT username, password_hash, role FROM admin_users WHERE username = ? AND enabled = 1',
  ).bind(username).first<AdminUserRecord>();

  if (!admin || !(await verifyPassword(password, admin.password_hash))) {
    return json({ error: '账号或密码错误' }, 401);
  }

  const session = { username: admin.username, role: admin.role || 'admin' };
  const token = await signJwt(session, env.JWT_SECRET);

  return json({ token, admin: session });
}

async function listAdminUsers({ env }: RequestContext): Promise<Response> {
  const { results } = await env.DB.prepare(`
    WITH latest_charts AS (
      SELECT chart.*
      FROM birth_charts chart
      INNER JOIN (
        SELECT user_id, MAX(created_at) AS created_at
        FROM birth_charts
        GROUP BY user_id
      ) latest
        ON latest.user_id = chart.user_id
       AND latest.created_at = chart.created_at
    )
    SELECT
      users.id,
      users.client_id AS clientId,
      users.display_name AS displayName,
      COALESCE(latest_charts.customer_name, users.display_name, '') AS customerName,
      COALESCE(latest_charts.birth_date, '') AS birthDate,
      COALESCE(latest_charts.birth_time, '') AS birthTime,
      COALESCE(latest_charts.birth_calendar, '') AS birthCalendar,
      COALESCE(latest_charts.birth_place, '') AS birthPlace,
      COALESCE(latest_charts.gender, '') AS gender,
      COALESCE(latest_charts.target_date, '') AS targetDate,
      users.last_active_at AS lastActiveAt,
      COUNT(DISTINCT birth_charts.id) AS chartCount,
      CASE WHEN SUM(CASE WHEN orders.status = 'paid' THEN 1 ELSE 0 END) > 0 THEN 'paid' ELSE 'unpaid' END AS paidStatus
    FROM users
    LEFT JOIN birth_charts ON birth_charts.user_id = users.id
    LEFT JOIN latest_charts ON latest_charts.user_id = users.id
    LEFT JOIN orders ON orders.user_id = users.id
    GROUP BY users.id
    ORDER BY users.last_active_at DESC
    LIMIT 200
  `).all();

  return json({ users: results });
}

async function deleteAdminUser({ env, params }: RequestContext): Promise<Response> {
  const clientId = decodeURIComponent(normalizeText(params.clientId));
  if (!clientId) return json({ error: '缺少 clientId' }, 400);

  const user = await env.DB.prepare('SELECT id FROM users WHERE client_id = ?').bind(clientId).first<{ id: string }>();
  if (!user) return json({ deleted: false, clientId }, 404);

  await env.DB.prepare('DELETE FROM orders WHERE user_id = ?').bind(user.id).run();
  await env.DB.prepare('DELETE FROM birth_charts WHERE user_id = ?').bind(user.id).run();
  await env.DB.prepare('DELETE FROM users WHERE client_id = ?').bind(clientId).run();

  return json({ deleted: true, clientId });
}

async function getAiConfig({ env }: RequestContext): Promise<Response> {
  const [record, visionRecord] = await Promise.all([
    loadAiConfig(env, DEFAULT_AI_PROVIDER),
    loadAiConfig(env, VISION_AI_PROVIDER),
  ]);
  return json({ config: toPublicAiConfig(record, visionRecord) });
}

async function saveAiConfig({ request, env }: RequestContext): Promise<Response> {
  const body = await readJson<{
    provider?: string;
    baseUrl?: string;
    model?: string;
    apiKey?: string;
    vision?: {
      provider?: string;
      baseUrl?: string;
      model?: string;
      apiKey?: string;
    };
  }>(request);
  const provider = normalizeText(body.provider) || DEFAULT_AI_PROVIDER;
  const baseUrl = normalizeText(body.baseUrl) || DEFAULT_AI_BASE_URL;
  const model = normalizeText(body.model) || DEFAULT_AI_MODEL;
  const existing = await loadAiConfig(env, DEFAULT_AI_PROVIDER);
  const apiKey = typeof body.apiKey === 'string' && body.apiKey.trim()
    ? body.apiKey.trim()
    : existing ? await decryptSecret(existing.encrypted_api_key, env.CONFIG_ENCRYPTION_KEY) : '';
  const encryptedApiKey = apiKey ? await encryptSecret(apiKey, env.CONFIG_ENCRYPTION_KEY) : '';
  const updatedAt = new Date().toISOString();

  const savedText = await saveAiConfigRecord(env, {
    provider,
    baseUrl,
    model,
    apiKey,
    encryptedApiKey,
    updatedAt,
  });

  const visionBody = body.vision ?? {};
  const existingVision = await loadAiConfig(env, VISION_AI_PROVIDER);
  const visionBaseUrl = normalizeText(visionBody.baseUrl) || existingVision?.base_url || DEFAULT_VISION_AI_BASE_URL;
  const visionModel = normalizeText(visionBody.model) || existingVision?.model || DEFAULT_VISION_AI_MODEL;
  const visionApiKey = typeof visionBody.apiKey === 'string' && visionBody.apiKey.trim()
    ? visionBody.apiKey.trim()
    : existingVision ? await decryptSecret(existingVision.encrypted_api_key, env.CONFIG_ENCRYPTION_KEY) : '';
  const encryptedVisionApiKey = visionApiKey ? await encryptSecret(visionApiKey, env.CONFIG_ENCRYPTION_KEY) : '';
  const savedVision = await saveAiConfigRecord(env, {
    provider: VISION_AI_PROVIDER,
    baseUrl: visionBaseUrl,
    model: visionModel,
    apiKey: visionApiKey,
    encryptedApiKey: encryptedVisionApiKey,
    updatedAt,
  });

  return json({
    config: toPublicAiConfig(savedText, savedVision),
  });
}

async function getPaymentConfig({ env, params }: RequestContext): Promise<Response> {
  const provider = normalizePaymentProvider(params.provider);
  const record = await env.DB.prepare(`
    SELECT provider, enabled, merchant_id, app_id, encrypted_private_key, webhook_secret_hint, updated_at
    FROM payment_configs
    WHERE provider = ?
  `).bind(provider).first<Record<string, unknown>>();

  return json({ config: record ? toPublicPaymentConfig(record) : defaultPaymentConfig(provider) });
}

async function savePaymentConfig({ request, env, params }: RequestContext): Promise<Response> {
  const provider = normalizePaymentProvider(params.provider);
  const body = await readJson<{
    enabled?: boolean;
    merchantId?: string;
    appId?: string;
    privateKey?: string;
    webhookSecretHint?: string;
  }>(request);
  const existing = await env.DB.prepare(`
    SELECT encrypted_private_key FROM payment_configs WHERE provider = ?
  `).bind(provider).first<{ encrypted_private_key?: string }>();
  const privateKey = typeof body.privateKey === 'string' && body.privateKey.trim()
    ? body.privateKey.trim()
    : existing?.encrypted_private_key
      ? await decryptSecret(existing.encrypted_private_key, env.CONFIG_ENCRYPTION_KEY)
      : '';
  const encryptedPrivateKey = privateKey ? await encryptSecret(privateKey, env.CONFIG_ENCRYPTION_KEY) : '';
  const updatedAt = new Date().toISOString();

  await env.DB.prepare(`INSERT OR REPLACE INTO payment_configs
      (provider, enabled, merchant_id, app_id, encrypted_private_key, webhook_secret_hint, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    provider,
    body.enabled ? 1 : 0,
    normalizeText(body.merchantId),
    normalizeText(body.appId),
    encryptedPrivateKey,
    normalizeText(body.webhookSecretHint),
    updatedAt,
  ).run();

  return json({
    config: {
      provider,
      enabled: Boolean(body.enabled),
      merchantId: normalizeText(body.merchantId),
      appId: normalizeText(body.appId),
      hasPrivateKey: Boolean(privateKey),
      webhookSecretHint: normalizeText(body.webhookSecretHint),
      updatedAt,
    },
  });
}

async function saveChart({ request, env }: RequestContext): Promise<Response> {
  const body = await readJson<{
    clientId?: string;
    displayName?: string;
    form?: Record<string, unknown>;
    result?: Record<string, unknown>;
  }>(request);
  const clientId = normalizeText(body.clientId);

  if (!clientId || !body.form || !body.result) {
    return json({ error: '缺少 clientId、form 或 result' }, 400);
  }

  const now = new Date().toISOString();
  const userId = `user_${hashId(clientId)}`;
  const form = body.form;
  const customerName = normalizeText(form.customerName) || normalizeText(form.name) || normalizeText(body.displayName);

  await env.DB.prepare(`INSERT INTO users (id, client_id, display_name, last_active_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(client_id) DO UPDATE SET display_name = excluded.display_name, last_active_at = excluded.last_active_at
  `).bind(userId, clientId, customerName, now).run();

  const chartId = createId('chart');
  await env.DB.prepare(`INSERT INTO birth_charts (
      id, user_id, customer_name, birth_date, birth_time, birth_calendar, gender, birth_place,
      target_date, strategy, lucky_numbers_json, chart_json, result_json, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    chartId,
    userId,
    customerName,
    normalizeText(form.birthDate),
    normalizeText(form.birthTime),
    normalizeText(form.birthCalendar) || 'solar',
    normalizeText(form.gender) || 'unspecified',
    normalizeText(form.birthPlace),
    normalizeText(form.targetDate),
    normalizeText(form.strategy) || 'balance',
    JSON.stringify(form.luckyNumbers ?? []),
    JSON.stringify(form),
    JSON.stringify(body.result),
    now,
  ).run();

  return json({ chartId, userId });
}

async function proxyAiChat({ request, env }: RequestContext): Promise<Response> {
  const body = await readJson<{ messages?: AiMessage[]; model?: string }>(request);

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return json({ error: '缺少 messages' }, 400);
  }

  const hasImage = messagesContainImage(body.messages);
  const config = await loadAiConfig(env, hasImage ? VISION_AI_PROVIDER : DEFAULT_AI_PROVIDER);
  if (!config?.encrypted_api_key) {
    return json({ error: hasImage ? '后台尚未配置视觉模型 API Key' : '后台尚未配置模型 API Key' }, 400);
  }

  const startedAt = Date.now();
  const apiKey = await decryptSecret(config.encrypted_api_key, env.CONFIG_ENCRYPTION_KEY);
  const model = normalizeText(body.model) || config.model;

  try {
    const response = await fetch(config.base_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(buildAiPayload(model, body.messages)),
    });
    const payload = await response.json().catch(() => ({})) as {
      choices?: Array<{ message?: { content?: string | null } }>;
      error?: { message?: string };
    };

    if (!response.ok) {
      const message = payload.error?.message || `模型调用失败，HTTP ${response.status}`;
      await logApiCall(env, config.provider, model, 'failed', Date.now() - startedAt, message);
      return json({ error: message }, response.status);
    }

    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) {
      await logApiCall(env, config.provider, model, 'failed', Date.now() - startedAt, '模型返回为空');
      return json({ error: '模型返回为空' }, 502);
    }

    await logApiCall(env, config.provider, model, 'success', Date.now() - startedAt);
    return json({ content });
  } catch (error) {
    const message = error instanceof Error ? error.message : '模型调用异常';
    await logApiCall(env, config.provider, model, 'failed', Date.now() - startedAt, message);
    return json({ error: message }, 502);
  }
}

async function createPaymentOrder({ request, env }: RequestContext): Promise<Response> {
  const body = await readJson<{
    clientId?: string;
    chartId?: string;
    provider?: string;
    amountCents?: number;
    currency?: string;
  }>(request);
  const clientId = normalizeText(body.clientId);
  const provider = normalizePaymentProvider(body.provider || 'wechat');
  const amountCents = Number.isInteger(body.amountCents) ? body.amountCents! : 0;

  if (!clientId || amountCents <= 0) {
    return json({ error: '缺少 clientId 或订单金额' }, 400);
  }

  const now = new Date().toISOString();
  const userId = `user_${hashId(clientId)}`;
  const orderId = createId('order');
  const orderNo = `TCO${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

  await env.DB.prepare(`INSERT INTO orders
      (id, order_no, user_id, chart_id, provider, amount_cents, status, currency, raw_payload_json, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    orderId,
    orderNo,
    userId,
    normalizeText(body.chartId),
    provider,
    amountCents,
    'pending',
    normalizeText(body.currency) || 'CNY',
    '{}',
    now,
    now,
  ).run();

  return json({ orderId, orderNo, status: 'pending' });
}

function buildAiPayload(model: string, messages: AiMessage[]) {
  const payload: {
    model: string;
    messages: AiMessage[];
    temperature: number;
    max_tokens: number;
    thinking?: { type: 'disabled' };
  } = {
    model,
    messages,
    temperature: 0.7,
    max_tokens: 4096,
  };

  // if (!messagesContainImage(messages)) {
  //   payload.thinking = { type: 'disabled' };
  // }

  return payload;
}

function messagesContainImage(messages: AiMessage[]): boolean {
  return messages.some((message) => {
    if (!Array.isArray(message.content)) return false;

    return message.content.some((part) => {
      return Boolean(
        part
          && typeof part === 'object'
          && 'type' in part
          && (part as { type?: unknown }).type === 'image_url',
      );
    });
  });
}

async function recordPaymentWebhook({ request, params }: RequestContext): Promise<Response> {
  const provider = normalizePaymentProvider(params.provider);
  const payloadText = await request.text();

  return json({
    provider,
    status: 'recorded',
    rawPayloadLength: payloadText.length,
    verification: 'pending-payment-integration',
  });
}

async function loadAiConfig(env: WorkerEnv, provider = DEFAULT_AI_PROVIDER): Promise<AiConfigRecord | null> {
  return env.DB.prepare(`
    SELECT provider, base_url, model, encrypted_api_key, updated_at
    FROM ai_configs
    WHERE provider = ?
  `).bind(provider).first<AiConfigRecord>();
}

async function saveAiConfigRecord(
  env: WorkerEnv,
  config: {
    provider: string;
    baseUrl: string;
    model: string;
    apiKey: string;
    encryptedApiKey: string;
    updatedAt: string;
  },
): Promise<AiConfigRecord> {
  await env.DB.prepare(`INSERT OR REPLACE INTO ai_configs (provider, base_url, model, encrypted_api_key, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    config.provider,
    config.baseUrl,
    config.model,
    config.encryptedApiKey,
    config.updatedAt,
  ).run();

  return {
    provider: config.provider,
    base_url: config.baseUrl,
    model: config.model,
    encrypted_api_key: config.encryptedApiKey,
    updated_at: config.updatedAt,
  };
}

function toPublicAiConfig(record: AiConfigRecord | null, visionRecord?: AiConfigRecord | null) {
  return {
    provider: record?.provider ?? DEFAULT_AI_PROVIDER,
    baseUrl: record?.base_url ?? DEFAULT_AI_BASE_URL,
    model: record?.model ?? DEFAULT_AI_MODEL,
    hasApiKey: Boolean(record?.encrypted_api_key),
    updatedAt: record?.updated_at ?? '',
    vision: {
      provider: visionRecord?.provider ?? VISION_AI_PROVIDER,
      baseUrl: visionRecord?.base_url ?? DEFAULT_VISION_AI_BASE_URL,
      model: visionRecord?.model ?? DEFAULT_VISION_AI_MODEL,
      hasApiKey: Boolean(visionRecord?.encrypted_api_key),
      updatedAt: visionRecord?.updated_at ?? '',
    },
  };
}

function defaultPaymentConfig(provider: string) {
  return {
    provider,
    enabled: false,
    merchantId: '',
    appId: '',
    hasPrivateKey: false,
    webhookSecretHint: '',
    updatedAt: '',
  };
}

function toPublicPaymentConfig(record: Record<string, unknown>) {
  return {
    provider: String(record.provider ?? ''),
    enabled: Boolean(record.enabled),
    merchantId: String(record.merchant_id ?? ''),
    appId: String(record.app_id ?? ''),
    hasPrivateKey: Boolean(record.encrypted_private_key),
    webhookSecretHint: String(record.webhook_secret_hint ?? ''),
    updatedAt: String(record.updated_at ?? ''),
  };
}

async function logApiCall(
  env: WorkerEnv,
  provider: string,
  model: string,
  status: 'success' | 'failed',
  durationMs: number,
  errorMessage = '',
): Promise<void> {
  await env.DB.prepare(`INSERT INTO api_call_logs (id, provider, model, endpoint, duration_ms, status, error_message, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    createId('log'),
    provider,
    model,
    '/api/ai/chat',
    durationMs,
    status,
    errorMessage,
    new Date().toISOString(),
  ).run();
}

async function requireAdmin(request: Request, env: WorkerEnv): Promise<AdminSession | null> {
  const header = request.headers.get('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return null;
  return verifyJwt(token, env.JWT_SECRET);
}

async function signJwt(session: AdminSession, secret: string): Promise<string> {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64UrlEncode(JSON.stringify({
    ...session,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8,
  }));
  const signature = await hmacSha256(`${header}.${payload}`, secret);
  return `${header}.${payload}.${signature}`;
}

async function verifyJwt(token: string, secret: string): Promise<AdminSession | null> {
  const [header, payload, signature] = token.split('.');
  if (!header || !payload || !signature) return null;

  const expected = await hmacSha256(`${header}.${payload}`, secret);
  if (signature !== expected) return null;

  try {
    const decoded = JSON.parse(base64UrlDecode(payload)) as AdminSession & { exp?: number };
    if (!decoded.username || !decoded.role || !decoded.exp || decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return { username: decoded.username, role: decoded.role };
  } catch {
    return null;
  }
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (hash.startsWith('plain:')) return password === hash.slice(6);

  const [scheme, salt, expected] = hash.split(':');
  if (scheme !== 'sha256' || !salt || !expected) return false;

  const actual = await sha256(`${salt}:${password}`);
  return actual === expected;
}

async function encryptSecret(value: string, keySeed: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await aesKey(keySeed);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(value),
  );

  return `${base64UrlEncodeBytes(iv)}.${base64UrlEncodeBytes(new Uint8Array(encrypted))}`;
}

async function decryptSecret(value: string, keySeed: string): Promise<string> {
  const [ivText, payloadText] = value.split('.');
  if (!ivText || !payloadText) return '';

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64UrlDecodeBytes(ivText) },
    await aesKey(keySeed),
    base64UrlDecodeBytes(payloadText),
  );

  return new TextDecoder().decode(decrypted);
}

async function aesKey(seed: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(seed));
  return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function hmacSha256(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return base64UrlEncodeBytes(new Uint8Array(signature));
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function readJson<T>(request: Request): Promise<T> {
  try {
    return await request.json() as T;
  } catch {
    return {} as T;
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(),
    },
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  };
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizePaymentProvider(provider: string): string {
  return provider === 'alipay' ? 'alipay' : 'wechat';
}

function createId(prefix: string): string {
  const random = crypto.getRandomValues(new Uint8Array(8));
  return `${prefix}_${Date.now().toString(36)}${base64UrlEncodeBytes(random)}`;
}

function hashId(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function base64UrlEncode(value: string): string {
  return base64UrlEncodeBytes(new TextEncoder().encode(value));
}

function base64UrlDecode(value: string): string {
  return new TextDecoder().decode(base64UrlDecodeBytes(value));
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecodeBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
