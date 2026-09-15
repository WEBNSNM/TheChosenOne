import type { DeepSeekMessage } from './deepseekClient';
import type { GrowthReportInput } from './consultation';

export interface AdminSession {
  token: string;
  admin: {
    username: string;
    role: string;
  };
}

export interface AdminUserSummary {
  id: string;
  clientId: string;
  displayName: string;
  customerName: string;
  birthDate: string;
  birthTime: string;
  birthCalendar: string;
  birthPlace: string;
  gender: string;
  targetDate: string;
  paidStatus: 'paid' | 'unpaid';
  chartCount: number;
  lastActiveAt: string;
}

export interface AiConfigInput {
  provider: string;
  baseUrl: string;
  model: string;
  apiKey?: string;
  vision?: {
    provider: string;
    baseUrl: string;
    model: string;
    apiKey?: string;
  };
}

export interface AiConfigView {
  provider: string;
  baseUrl?: string;
  model?: string;
  hasApiKey: boolean;
  updatedAt?: string;
  vision: {
    provider: string;
    baseUrl?: string;
    model?: string;
    hasApiKey: boolean;
    updatedAt?: string;
  };
}

export interface ChartSubmission {
  clientId: string;
  displayName?: string;
  form: Record<string, unknown>;
  result: Record<string, unknown>;
}

export interface AiChatRequest {
  idempotencyKey: string;
  messages: DeepSeekMessage[];
  model?: string;
}

export class BackendClientError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'BackendClientError';
    this.status = status;
  }
}

export interface AccessEntitlement {
  status: string;
  maxUses: number;
  usedCount: number;
  remainingUses: number;
  expiresAt: string | null;
}

export interface AccessConfig {
  maxUses: number;
  validDays: number;
}

export interface AccessCodeView {
  id: string;
  code?: string;
  codeSuffix: string;
  status: string;
  maxUses: number;
  usedCount: number;
  remainingUses: number;
  validDays: number;
  orderReference: string;
  note: string;
  issuedAt: string | null;
  redeemedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReportGenerateRequest extends GrowthReportInput {
  idempotencyKey: string;
}

const CLIENT_ID_KEY = 'the-chosen-one:client-id';

export async function adminLogin(username: string, password: string): Promise<AdminSession> {
  return requestJson(getApiUrl('/api/admin/login'), {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function getAdminUsers(token: string): Promise<AdminUserSummary[]> {
  const response = await requestJson<{ users: AdminUserSummary[] }>(getApiUrl('/api/admin/users'), {
    headers: authHeaders(token),
  });
  return response.users;
}

export async function deleteAdminUser(token: string, clientId: string): Promise<{ deleted: boolean; clientId: string }> {
  return requestJson(getApiUrl(`/api/admin/users/${encodeURIComponent(clientId)}`), {
    method: 'DELETE',
    headers: authHeaders(token),
  });
}

export async function getAiConfig(token: string): Promise<AiConfigView> {
  const response = await requestJson<{ config: AiConfigView }>(getApiUrl('/api/admin/ai-config'), {
    headers: authHeaders(token),
  });
  return response.config;
}

export async function saveAiConfig(token: string, config: AiConfigInput): Promise<AiConfigView> {
  const response = await requestJson<{ config: AiConfigView }>(getApiUrl('/api/admin/ai-config'), {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(config),
  });
  return response.config;
}

export async function submitChart(submission: ChartSubmission): Promise<{ chartId: string; userId: string }> {
  return requestJson(getApiUrl('/api/charts'), {
    method: 'POST',
    body: JSON.stringify(submission),
  });
}

export async function submitAiChat(request: AiChatRequest): Promise<string> {
  const response = await requestJson<{ content: string }>(getApiUrl('/api/ai/chat'), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return response.content;
}

export async function redeemAccessCode(code: string): Promise<AccessEntitlement> {
  const response = await requestJson<{ access: AccessEntitlement }>(getApiUrl('/api/access/redeem'), {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify({ code }),
  });
  return response.access;
}

export async function getAccessMe(): Promise<AccessEntitlement> {
  const response = await requestJson<{ access: AccessEntitlement }>(getApiUrl('/api/access/me'), {
    credentials: 'include',
  });
  return response.access;
}

export async function getAccessConfig(): Promise<AccessConfig> {
  const response = await requestJson<{ access: AccessConfig }>(getApiUrl('/api/access/config'), { method: 'GET' });
  return response.access;
}

export async function logoutAccess(): Promise<{ loggedOut: boolean }> {
  return requestJson(getApiUrl('/api/access/logout'), {
    method: 'POST',
    credentials: 'include',
  });
}

export async function generateReport(request: ReportGenerateRequest): Promise<string> {
  const response = await requestJson<{ content: string }>(getApiUrl('/api/reports/generate'), {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify(request),
  });
  return response.content;
}

export async function createAdminAccessCodeBatch(
  token: string,
  batchSize: 10 | 50 | 100,
): Promise<{ codes: string[]; records: AccessCodeView[] }> {
  return requestJson(getApiUrl('/api/admin/access-codes/batches'), {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ batchSize }),
  });
}

export async function listAdminAccessCodes(
  token: string,
  filters: { status?: string; query?: string } = {},
): Promise<AccessCodeView[]> {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.query) params.set('query', filters.query);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  const response = await requestJson<{ codes: AccessCodeView[] }>(getApiUrl(`/api/admin/access-codes${suffix}`), {
    headers: authHeaders(token),
  });
  return response.codes;
}

export async function adjustAdminAccessCode(
  token: string,
  id: string,
  action: { action: 'issue' | 'disable' | 'resetBinding' | 'adjustQuota'; orderReference?: string; note?: string; delta?: number },
): Promise<AccessCodeView> {
  const response = await requestJson<{ code: AccessCodeView }>(getApiUrl(`/api/admin/access-codes/${encodeURIComponent(id)}`), {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(action),
  });
  return response.code;
}

export async function deleteAdminAccessCodes(token: string, ids: string[]): Promise<number> {
  const response = await requestJson<{ deleted: number }>(getApiUrl('/api/admin/access-codes'), {
    method: 'DELETE', headers: { ...authHeaders(token), 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }),
  });
  return response.deleted;
}

export async function getAdminAccessPolicy(token: string): Promise<AccessConfig> {
  const response = await requestJson<{ access: AccessConfig }>(getApiUrl('/api/admin/access-policy'), { headers: { Authorization: `Bearer ${token}` } });
  return response.access;
}

export async function saveAdminAccessPolicy(token: string, access: AccessConfig): Promise<AccessConfig> {
  const response = await requestJson<{ access: AccessConfig }>(getApiUrl('/api/admin/access-policy'), {
    method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(access),
  });
  return response.access;
}

export function getApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const baseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '') ?? '';

  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
}

export function getClientId(storage = getBrowserStorage()): string {
  const existing = storage?.getItem(CLIENT_ID_KEY);
  if (existing) return existing;

  const created = `client_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  storage?.setItem(CLIENT_ID_KEY, created);
  return created;
}

async function requestJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = { ...(init.headers as Record<string, string> | undefined) };
  if (!headers['Content-Type'] && init.body) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, { ...init, headers });
  const payload = await response.json().catch(() => ({})) as { error?: string };

  if (!response.ok) {
    throw new BackendClientError(payload.error || `请求失败：HTTP ${response.status}`, response.status);
  }

  return payload as T;
}

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

function getBrowserStorage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}
