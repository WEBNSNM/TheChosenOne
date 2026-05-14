import { describe, expect, it, vi } from 'vitest';
import {
  adminLogin,
  deleteAdminUser,
  getAdminUsers,
  saveAiConfig,
  submitAiChat,
  submitChart,
  getApiUrl,
} from '../../src/domain/backendClient';

describe('backend client', () => {
  it('builds api urls from the configured environment base url', () => {
    vi.stubEnv('VITE_API_BASE_URL', 'http://127.0.0.1:8787/');

    expect(getApiUrl('/api/charts')).toBe('http://127.0.0.1:8787/api/charts');

    vi.stubEnv('VITE_API_BASE_URL', 'https://xxymj.indevs.in');

    expect(getApiUrl('/api/admin/users')).toBe('https://xxymj.indevs.in/api/admin/users');

    vi.unstubAllEnvs();
  });

  it('uses worker api routes for admin and chart requests', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith('/api/admin/login')) {
        return new Response(JSON.stringify({ token: 'jwt', admin: { username: 'admin', role: 'owner' } }));
      }

      if (url.endsWith('/api/admin/users')) {
        return new Response(JSON.stringify({ users: [] }));
      }

      if (url.endsWith('/api/admin/users/client-1')) {
        return new Response(JSON.stringify({ deleted: true, clientId: 'client-1' }));
      }

      if (url.endsWith('/api/admin/ai-config')) {
        return new Response(JSON.stringify({
          config: {
            provider: 'deepseek',
            hasApiKey: true,
            vision: { provider: 'vision', hasApiKey: true },
          },
        }));
      }

      if (url.endsWith('/api/charts')) {
        return new Response(JSON.stringify({ chartId: 'chart-1', userId: 'user-1' }));
      }

      if (url.endsWith('/api/ai/chat')) {
        return new Response(JSON.stringify({ content: 'ok' }));
      }

      return new Response('{}', { status: 404 });
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(adminLogin('admin', 'secret')).resolves.toEqual({
      token: 'jwt',
      admin: { username: 'admin', role: 'owner' },
    });
    await expect(getAdminUsers('jwt')).resolves.toEqual([]);
    await expect(deleteAdminUser('jwt', 'client-1')).resolves.toEqual({ deleted: true, clientId: 'client-1' });
    await expect(saveAiConfig('jwt', {
      provider: 'deepseek',
      baseUrl: 'https://api.deepseek.com/chat/completions',
      model: 'deepseek-v4-flash',
      apiKey: 'sk-test',
      vision: {
        provider: 'vision',
        baseUrl: 'https://api.openai.com/v1/chat/completions',
        model: 'vision-model',
        apiKey: 'sk-vision',
      },
    })).resolves.toEqual({
      provider: 'deepseek',
      hasApiKey: true,
      vision: { provider: 'vision', hasApiKey: true },
    });
    await expect(submitChart({
      clientId: 'client-1',
      form: { customerName: '林一', birthDate: '1990-01-02' },
      result: { score: 88 },
    })).resolves.toEqual({ chartId: 'chart-1', userId: 'user-1' });
    await expect(submitAiChat({ messages: [{ role: 'user', content: 'hi' }] })).resolves.toBe('ok');

    expect(fetchMock).toHaveBeenCalledWith('/api/admin/users', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer jwt' }),
    }));
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/users/client-1', expect.objectContaining({
      method: 'DELETE',
      headers: expect.objectContaining({ Authorization: 'Bearer jwt' }),
    }));
    vi.unstubAllGlobals();
  });
});
