<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { LogOut, RefreshCw, Save, Search, ServerCog, ShieldCheck, Trash2, Users } from 'lucide-vue-next';
import {
  adminLogin,
  deleteAdminUser,
  getAdminUsers,
  getAiConfig,
  saveAiConfig,
  type AdminUserSummary,
  type AiConfigView,
} from '../domain/backendClient';

type AdminPage = 'users' | 'api-config';

const ADMIN_TOKEN_KEY = 'the-chosen-one:admin-token';

const username = ref('admin');
const password = ref('');
const token = ref(loadToken());
const activePage = ref<AdminPage>(getAdminPageFromHash());
const users = ref<AdminUserSummary[]>([]);
const aiConfig = ref<AiConfigView>({
  provider: 'deepseek',
  baseUrl: 'https://api.deepseek.com/chat/completions',
  model: 'deepseek-v4-flash',
  hasApiKey: false,
  vision: {
    provider: 'vision',
    baseUrl: 'https://api.openai.com/v1/chat/completions',
    model: 'vision-model',
    hasApiKey: false,
  },
});
const apiKey = ref('');
const visionApiKey = ref('');
const isLoading = ref(false);
const message = ref('');
const error = ref('');

const isLoggedIn = computed(() => Boolean(token.value));
const userCount = computed(() => users.value.length);
const paidCount = computed(() => users.value.filter((user) => user.paidStatus === 'paid').length);
const chartCount = computed(() => users.value.reduce((sum, user) => sum + Number(user.chartCount || 0), 0));

onMounted(() => {
  if (token.value) {
    void loadDashboard();
  }
});

async function submitLogin(): Promise<void> {
  isLoading.value = true;
  error.value = '';

  try {
    const session = await adminLogin(username.value, password.value);
    token.value = session.token;
    localStorage.setItem(ADMIN_TOKEN_KEY, session.token);
    password.value = '';
    message.value = `欢迎回来，${session.admin.username}`;
    await loadDashboard();
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '登录失败';
  } finally {
    isLoading.value = false;
  }
}

async function loadDashboard(): Promise<void> {
  if (!token.value) return;

  isLoading.value = true;
  error.value = '';

  try {
    const [userRows, config] = await Promise.all([
      getAdminUsers(token.value),
      getAiConfig(token.value),
    ]);
    users.value = userRows;
    aiConfig.value = {
      provider: config.provider || 'deepseek',
      baseUrl: config.baseUrl || 'https://api.deepseek.com/chat/completions',
      model: config.model || 'deepseek-v4-flash',
      hasApiKey: Boolean(config.hasApiKey),
      updatedAt: config.updatedAt,
      vision: {
        provider: config.vision.provider || 'vision',
        baseUrl: config.vision.baseUrl || 'https://api.openai.com/v1/chat/completions',
        model: config.vision.model || 'vision-model',
        hasApiKey: Boolean(config.vision.hasApiKey),
        updatedAt: config.vision.updatedAt,
      },
    };
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '后台数据加载失败';
    if (String(error.value).includes('Unauthorized')) logout();
  } finally {
    isLoading.value = false;
  }
}

async function submitAiConfig(): Promise<void> {
  if (!token.value) return;

  isLoading.value = true;
  error.value = '';
  message.value = '';

  try {
    const saved = await saveAiConfig(token.value, {
      provider: aiConfig.value.provider,
      baseUrl: aiConfig.value.baseUrl || '',
      model: aiConfig.value.model || '',
      apiKey: apiKey.value,
      vision: {
        provider: 'vision',
        baseUrl: aiConfig.value.vision.baseUrl || '',
        model: aiConfig.value.vision.model || '',
        apiKey: visionApiKey.value,
      },
    });
    aiConfig.value = saved;
    apiKey.value = '';
    visionApiKey.value = '';
    message.value = 'API 配置已保存';
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '保存失败';
  } finally {
    isLoading.value = false;
  }
}

async function removeUser(user: AdminUserSummary): Promise<void> {
  if (!token.value) return;

  const label = user.customerName || user.clientId;
  if (!window.confirm(`确认删除 ${label} 的用户、命盘和订单记录吗？`)) return;

  isLoading.value = true;
  error.value = '';
  message.value = '';

  try {
    await deleteAdminUser(token.value, user.clientId);
    users.value = users.value.filter((item) => item.clientId !== user.clientId);
    message.value = '用户记录已删除';
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '删除失败';
  } finally {
    isLoading.value = false;
  }
}

function logout(): void {
  token.value = '';
  localStorage.removeItem(ADMIN_TOKEN_KEY);
  window.location.hash = '#/admin/login';
}

function setAdminPage(page: AdminPage): void {
  activePage.value = page;
  window.location.hash = page === 'api-config' ? '#/admin/api-config' : '#/admin/users';
}

function loadToken(): string {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

function getAdminPageFromHash(): AdminPage {
  return window.location.hash === '#/admin/api-config' ? 'api-config' : 'users';
}

function formatTime(value?: string): string {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatGender(value?: string): string {
  if (value === 'male') return '男';
  if (value === 'female') return '女';
  if (value === 'unspecified') return '不透露';
  return value || '-';
}

function formatCalendar(value?: string): string {
  if (value === 'solar') return '阳历';
  if (value === 'lunar') return '农历';
  return value || '-';
}
</script>

<template>
  <main class="admin-shell">
    <section v-if="!isLoggedIn" class="admin-login">
      <div class="admin-login-panel">
        <div class="admin-brand">
          <ShieldCheck :size="28" />
          <div>
            <p class="eyebrow">ADMIN</p>
            <h1>The Chosen One 后台</h1>
          </div>
        </div>

        <form class="admin-login-form" @submit.prevent="submitLogin">
          <label class="field">
            <span>账号</span>
            <input v-model="username" type="text" autocomplete="username" />
          </label>
          <label class="field">
            <span>密码</span>
            <input v-model="password" type="password" autocomplete="current-password" />
          </label>
          <button type="submit" class="primary-action" :disabled="isLoading">
            <ShieldCheck :size="18" />
            <span>{{ isLoading ? '登录中' : '登录后台' }}</span>
          </button>
        </form>

        <p v-if="error" class="share-error">{{ error }}</p>
        <p class="admin-hint">本地 seed 默认账号 admin / admin123，上线前请替换。</p>
      </div>
    </section>

    <section v-else class="admin-dashboard">
      <aside class="admin-sidebar">
        <div class="admin-brand compact">
          <ShieldCheck :size="24" />
          <div>
            <p class="eyebrow">ADMIN</p>
            <h1>后台系统</h1>
          </div>
        </div>

        <button
          type="button"
          class="admin-nav-item"
          :class="{ active: activePage === 'users' }"
          @click="setAdminPage('users')"
        >
          <Users :size="18" />
          <span>用户查询</span>
        </button>
        <button
          type="button"
          class="admin-nav-item"
          :class="{ active: activePage === 'api-config' }"
          @click="setAdminPage('api-config')"
        >
          <ServerCog :size="18" />
          <span>API 配置</span>
        </button>

        <button type="button" class="admin-nav-item logout" @click="logout">
          <LogOut :size="18" />
          <span>退出</span>
        </button>
      </aside>

      <div class="admin-content">
        <header class="admin-content-head">
          <div>
            <p class="eyebrow">CONTROL PANEL</p>
            <h2>{{ activePage === 'users' ? '用户查询' : 'API 配置' }}</h2>
          </div>
          <button type="button" class="secondary-action" :disabled="isLoading" @click="loadDashboard">
            <RefreshCw :size="17" :class="{ 'spin-icon': isLoading }" />
            <span>刷新</span>
          </button>
        </header>

        <p v-if="message" class="inline-notice">{{ message }}</p>
        <p v-if="error" class="share-error">{{ error }}</p>

        <section v-if="activePage === 'users'" class="admin-page">
          <div class="admin-stats">
            <div>
              <span>用户数</span>
              <strong>{{ userCount }}</strong>
            </div>
            <div>
              <span>命盘数</span>
              <strong>{{ chartCount }}</strong>
            </div>
            <div>
              <span>已付费</span>
              <strong>{{ paidCount }}</strong>
            </div>
          </div>

          <div class="admin-table-wrap">
            <div class="admin-table-title">
              <Search :size="18" />
              <span>最近用户</span>
            </div>
            <table class="admin-table">
              <thead>
                <tr>
                  <th>Client ID</th>
                  <th>姓名</th>
                  <th>出生日期</th>
                  <th>出生时间</th>
                  <th>历法</th>
                  <th>出生地</th>
                  <th>性别</th>
                  <th>流日日期</th>
                  <th>命盘</th>
                  <th>付费</th>
                  <th>最后活跃</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="user in users" :key="user.id">
                  <td>{{ user.clientId }}</td>
                  <td>{{ user.customerName || user.displayName || '-' }}</td>
                  <td>{{ user.birthDate || '-' }}</td>
                  <td>{{ user.birthTime || '-' }}</td>
                  <td>{{ formatCalendar(user.birthCalendar) }}</td>
                  <td>{{ user.birthPlace || '-' }}</td>
                  <td>{{ formatGender(user.gender) }}</td>
                  <td>{{ user.targetDate || '-' }}</td>
                  <td>{{ user.chartCount }}</td>
                  <td>
                    <span class="paid-pill" :class="user.paidStatus">{{ user.paidStatus === 'paid' ? '已付费' : '未付费' }}</span>
                  </td>
                  <td>{{ formatTime(user.lastActiveAt) }}</td>
                  <td>
                    <button type="button" class="table-action danger" :disabled="isLoading" @click="removeUser(user)">
                      <Trash2 :size="15" />
                      <span>删除</span>
                    </button>
                  </td>
                </tr>
                <tr v-if="users.length === 0">
                  <td colspan="12">暂无用户数据</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section v-else class="admin-page api-config-page">
          <form class="api-config-form" @submit.prevent="submitAiConfig">
            <div class="api-config-group">
              <h3>默认文本模型</h3>
              <label class="field">
                <span>Provider</span>
                <input v-model="aiConfig.provider" type="text" placeholder="deepseek" />
              </label>
              <label class="field">
                <span>Base URL</span>
                <input v-model="aiConfig.baseUrl" type="url" placeholder="https://api.deepseek.com/chat/completions" />
              </label>
              <label class="field">
                <span>Model</span>
                <input v-model="aiConfig.model" type="text" placeholder="deepseek-v4-flash" />
              </label>
              <label class="field">
                <span>API Key</span>
                <input v-model="apiKey" type="password" autocomplete="off" :placeholder="aiConfig.hasApiKey ? '已保存，留空保持不变' : '请输入 API Key'" />
              </label>
            </div>

            <div class="api-config-group">
              <h3>看图读盘视觉模型</h3>
              <label class="field">
                <span>Vision Base URL</span>
                <input v-model="aiConfig.vision.baseUrl" type="url" placeholder="https://api.openai.com/v1/chat/completions" />
              </label>
              <label class="field">
                <span>Vision Model</span>
                <input v-model="aiConfig.vision.model" type="text" placeholder="填写支持 image_url 的模型" />
              </label>
              <label class="field">
                <span>Vision API Key</span>
                <input v-model="visionApiKey" type="password" autocomplete="off" :placeholder="aiConfig.vision.hasApiKey ? '已保存，留空保持不变' : '请输入视觉模型 API Key'" />
              </label>
            </div>
            <button type="submit" class="primary-action" :disabled="isLoading">
              <Save :size="18" />
              <span>保存配置</span>
            </button>
          </form>

          <div class="admin-config-status">
            <strong>文本模型：{{ aiConfig.hasApiKey ? '已配置密钥' : '未配置密钥' }}</strong>
            <span>视觉模型：{{ aiConfig.vision.hasApiKey ? '已配置密钥' : '未配置密钥' }}</span>
            <span>更新时间：{{ formatTime(aiConfig.updatedAt) }}</span>
          </div>
        </section>
      </div>
    </section>
  </main>
</template>
