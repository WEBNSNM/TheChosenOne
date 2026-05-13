import type { DeepSeekMessage } from './deepseekClient';

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
}

export interface AiConfigView {
  provider: string;
  baseUrl?: string;
  model?: string;
  hasApiKey: boolean;
  updatedAt?: string;
}

export interface ChartSubmission {
  clientId: string;
  displayName?: string;
  form: Record<string, unknown>;
  result: Record<string, unknown>;
}

export interface AiChatRequest {
  messages: DeepSeekMessage[];
  model?: string;
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
    body: JSON.stringify(request),
  });
  return response.content;
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
    throw new Error(payload.error || `请求失败：HTTP ${response.status}`);
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
