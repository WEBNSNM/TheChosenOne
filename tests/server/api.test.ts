import { describe, expect, it, vi } from 'vitest';
import { createWorkerApp, type WorkerEnv } from '../../server/app';

class MemoryStatement {
  private readonly db: MemoryD1Database;
  private readonly sql: string;
  private params: unknown[] = [];

  constructor(db: MemoryD1Database, sql: string) {
    this.db = db;
    this.sql = sql;
  }

  bind(...params: unknown[]) {
    this.params = params;
    return this;
  }

  async first<T = unknown>(): Promise<T | null> {
    return this.db.first(this.sql, this.params) as T | null;
  }

  async all<T = unknown>(): Promise<{ results: T[] }> {
    return { results: this.db.all(this.sql, this.params) as T[] };
  }

  async run(): Promise<{ success: boolean }> {
    this.db.run(this.sql, this.params);
    return { success: true };
  }
}

class MemoryD1Database {
  readonly adminUsers = new Map<string, Record<string, unknown>>();
  readonly aiConfigs = new Map<string, Record<string, unknown>>();
  readonly users = new Map<string, Record<string, unknown>>();
  readonly birthCharts: Record<string, unknown>[] = [];
  readonly orders: Record<string, unknown>[] = [];
  readonly apiCallLogs: Record<string, unknown>[] = [];
  readonly paymentConfigs = new Map<string, Record<string, unknown>>();

  prepare(sql: string) {
    return new MemoryStatement(this, sql);
  }

  first(sql: string, params: unknown[]) {
    if (sql.includes('FROM admin_users')) {
      return this.adminUsers.get(String(params[0])) ?? null;
    }

    if (sql.includes('FROM ai_configs')) {
      return this.aiConfigs.get(String(params[0])) ?? null;
    }

    if (sql.includes('FROM payment_configs')) {
      return this.paymentConfigs.get(String(params[0])) ?? null;
    }

    if (sql.includes('FROM users WHERE client_id')) {
      return this.users.get(String(params[0])) ?? null;
    }

    return null;
  }

  all(sql: string) {
    if (sql.includes('FROM users')) {
      return Array.from(this.users.values()).map((user) => {
        const clientId = String(user.client_id);
        const charts = this.birthCharts.filter((chart) => chart.user_id === user.id);
        const latestChart = charts[charts.length - 1] ?? {};
        const orders = this.orders.filter((order) => order.user_id === user.id);
        return {
          id: user.id,
          clientId,
          displayName: user.display_name,
          customerName: latestChart.customer_name ?? user.display_name,
          birthDate: latestChart.birth_date ?? '',
          birthTime: latestChart.birth_time ?? '',
          birthCalendar: latestChart.birth_calendar ?? '',
          birthPlace: latestChart.birth_place ?? '',
          gender: latestChart.gender ?? '',
          targetDate: latestChart.target_date ?? '',
          paidStatus: orders.some((order) => order.status === 'paid') ? 'paid' : 'unpaid',
          chartCount: charts.length,
          lastActiveAt: user.last_active_at,
        };
      });
    }

    return [];
  }

  run(sql: string, params: unknown[]) {
    if (sql.startsWith('INSERT INTO users')) {
      this.users.set(String(params[1]), {
        id: params[0],
        client_id: params[1],
        display_name: params[2],
        last_active_at: params[3],
      });
    }

    if (sql.startsWith('UPDATE users')) {
      const user = this.users.get(String(params[2]));
      if (user) {
        user.display_name = params[0];
        user.last_active_at = params[1];
      }
    }

    if (sql.startsWith('INSERT INTO birth_charts')) {
      this.birthCharts.push({
        id: params[0],
        user_id: params[1],
        customer_name: params[2],
        birth_date: params[3],
        birth_time: params[4],
        birth_calendar: params[5],
        gender: params[6],
        birth_place: params[7],
        target_date: params[8],
        chart_json: params[11],
      });
    }

    if (sql.startsWith('INSERT OR REPLACE INTO ai_configs')) {
      this.aiConfigs.set(String(params[0]), {
        provider: params[0],
        base_url: params[1],
        model: params[2],
        encrypted_api_key: params[3],
        updated_at: params[4],
      });
    }

    if (sql.startsWith('INSERT OR REPLACE INTO payment_configs')) {
      this.paymentConfigs.set(String(params[0]), {
        provider: params[0],
        enabled: params[1],
        merchant_id: params[2],
        app_id: params[3],
        encrypted_private_key: params[4],
        webhook_secret_hint: params[5],
        updated_at: params[6],
      });
    }

    if (sql.startsWith('INSERT INTO orders')) {
      this.orders.push({
        id: params[0],
        order_no: params[1],
        user_id: params[2],
        provider: params[4],
        status: params[6],
      });
    }

    if (sql.startsWith('INSERT INTO api_call_logs')) {
      this.apiCallLogs.push({ id: params[0], status: params[6] });
    }

    if (sql.startsWith('DELETE FROM orders')) {
      const userId = String(params[0]);
      this.orders.splice(0, this.orders.length, ...this.orders.filter((order) => order.user_id !== userId));
    }

    if (sql.startsWith('DELETE FROM birth_charts')) {
      const userId = String(params[0]);
      this.birthCharts.splice(0, this.birthCharts.length, ...this.birthCharts.filter((chart) => chart.user_id !== userId));
    }

    if (sql.startsWith('DELETE FROM users')) {
      this.users.delete(String(params[0]));
    }
  }
}

function createEnv(db = new MemoryD1Database()): WorkerEnv {
  return {
    DB: db,
    JWT_SECRET: 'test-secret',
    CONFIG_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef',
  } as unknown as WorkerEnv;
}

async function login(app: ReturnType<typeof createWorkerApp>, env: WorkerEnv) {
  const response = await app.fetch(
    new Request('https://example.com/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'secret' }),
    }),
    env,
  );
  return (await response.json()) as { token: string };
}

describe('worker api', () => {
  it('logs in an administrator with a stored password hash', async () => {
    const db = new MemoryD1Database();
    db.adminUsers.set('admin', {
      username: 'admin',
      password_hash: 'plain:secret',
      role: 'owner',
    });
    const app = createWorkerApp();

    const response = await app.fetch(
      new Request('https://example.com/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'admin', password: 'secret' }),
      }),
      createEnv(db),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      token: expect.any(String),
      admin: { username: 'admin', role: 'owner' },
    });
  });

  it('protects admin users behind bearer auth', async () => {
    const response = await createWorkerApp().fetch(
      new Request('https://example.com/api/admin/users'),
      createEnv(),
    );

    expect(response.status).toBe(401);
  });

  it('stores chart submissions and exposes them in the admin user list', async () => {
    const db = new MemoryD1Database();
    db.adminUsers.set('admin', {
      username: 'admin',
      password_hash: 'plain:secret',
      role: 'owner',
    });
    const env = createEnv(db);
    const app = createWorkerApp();
    const { token } = await login(app, env);

    const chartResponse = await app.fetch(
      new Request('https://example.com/api/charts', {
        method: 'POST',
        body: JSON.stringify({
          clientId: 'client-1',
          displayName: '林一',
          form: {
            customerName: '林一',
            birthDate: '1990-01-02',
            birthTime: '08:30',
            birthCalendar: 'solar',
            gender: 'female',
            birthPlace: '杭州',
            targetDate: '2026-05-13',
            strategy: 'balance',
          },
          result: { score: 88, profile: { birth: { pillars: [] } } },
        }),
      }),
      env,
    );

    expect(chartResponse.status).toBe(200);

    const usersResponse = await app.fetch(
      new Request('https://example.com/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      }),
      env,
    );

    await expect(usersResponse.json()).resolves.toEqual({
      users: [
        expect.objectContaining({
          clientId: 'client-1',
          displayName: '林一',
          customerName: '林一',
          birthDate: '1990-01-02',
          birthTime: '08:30',
          birthCalendar: 'solar',
          birthPlace: '杭州',
          gender: 'female',
          targetDate: '2026-05-13',
          chartCount: 1,
          paidStatus: 'unpaid',
        }),
      ],
    });
  });

  it('deletes a user and the related chart records from the admin api', async () => {
    const db = new MemoryD1Database();
    db.adminUsers.set('admin', {
      username: 'admin',
      password_hash: 'plain:secret',
      role: 'owner',
    });
    const env = createEnv(db);
    const app = createWorkerApp();
    const { token } = await login(app, env);

    await app.fetch(
      new Request('https://example.com/api/charts', {
        method: 'POST',
        body: JSON.stringify({
          clientId: 'client-delete',
          form: {
            customerName: '待删除',
            birthDate: '1991-02-03',
            birthTime: '09:45',
            birthCalendar: 'solar',
            gender: 'male',
            birthPlace: '上海',
            targetDate: '2026-05-13',
            strategy: 'balance',
          },
          result: { score: 77, profile: { birth: { pillars: [] } } },
        }),
      }),
      env,
    );

    const deleteResponse = await app.fetch(
      new Request('https://example.com/api/admin/users/client-delete', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }),
      env,
    );

    expect(deleteResponse.status).toBe(200);
    await expect(deleteResponse.json()).resolves.toEqual({ deleted: true, clientId: 'client-delete' });

    const usersResponse = await app.fetch(
      new Request('https://example.com/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      }),
      env,
    );
    await expect(usersResponse.json()).resolves.toEqual({ users: [] });
  });

  it('redacts saved AI keys and proxies configured model calls', async () => {
    const db = new MemoryD1Database();
    db.adminUsers.set('admin', {
      username: 'admin',
      password_hash: 'plain:secret',
      role: 'owner',
    });
    const env = createEnv(db);
    const app = createWorkerApp();
    const { token } = await login(app, env);

    const saveResponse = await app.fetch(
      new Request('https://example.com/api/admin/ai-config', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          provider: 'deepseek',
          baseUrl: 'https://api.example.test/chat/completions',
          model: 'deepseek-v4-flash',
          apiKey: 'sk-secret',
        }),
      }),
      env,
    );
    expect(saveResponse.status).toBe(200);

    const configResponse = await app.fetch(
      new Request('https://example.com/api/admin/ai-config', {
        headers: { Authorization: `Bearer ${token}` },
      }),
      env,
    );
    await expect(configResponse.json()).resolves.toEqual({
      config: expect.objectContaining({
        provider: 'deepseek',
        model: 'deepseek-v4-flash',
        hasApiKey: true,
      }),
    });

    const fetchMock = vi.fn(async () => new Response(
      JSON.stringify({ choices: [{ message: { content: '后端模型返回' } }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ));
    vi.stubGlobal('fetch', fetchMock);

    const aiResponse = await app.fetch(
      new Request('https://example.com/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ role: 'user', content: '请解读' }],
        }),
      }),
      env,
    );

    await expect(aiResponse.json()).resolves.toEqual({ content: '后端模型返回' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.example.test/chat/completions',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer sk-secret' }),
      }),
    );
    vi.unstubAllGlobals();
  });
});
