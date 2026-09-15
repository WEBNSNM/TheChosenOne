<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { LogOut, RefreshCw, Save, Search, ServerCog, ShieldCheck, Trash2, Users, KeyRound, Plus, RotateCcw, Ban } from 'lucide-vue-next';
import {
  adminLogin,
  deleteAdminUser,
  getAdminUsers,
  getAiConfig,
  saveAiConfig,
  type AdminUserSummary,
  type AiConfigView,
  type AccessCodeView,
  createAdminAccessCodeBatch,
  listAdminAccessCodes,
  adjustAdminAccessCode,
  deleteAdminAccessCodes,
  getAdminAccessPolicy,
  saveAdminAccessPolicy,
  type AccessConfig,
} from '../domain/backendClient';

type AdminPage = 'users' | 'api-config' | 'access-codes';

const ADMIN_TOKEN_KEY = 'the-chosen-one:admin-token';

const username = ref('admin');
const password = ref('');
const token = ref(loadToken());
const activePage = ref<AdminPage>(getAdminPageFromHash());
const users = ref<AdminUserSummary[]>([]);
const accessCodes = ref<AccessCodeView[]>([]);
const generatedCodes = ref<string[]>([]);
const batchSize = ref<10 | 50 | 100>(10);
const codeStatusFilter = ref('');
const codeQuery = ref('');
const orderReference = ref('');
const accessPolicy = ref<AccessConfig>({ maxUses: 10, validDays: 7 });
const selectedCodeIds = ref<string[]>([]);
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
    const [userRows, config, policy] = await Promise.all([getAdminUsers(token.value), getAiConfig(token.value), getAdminAccessPolicy(token.value)]);
    users.value = userRows;
    accessPolicy.value = policy;
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
    if (activePage.value === 'access-codes') await loadAccessCodes();
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '后台数据加载失败';
    if ((caught && typeof caught === 'object' && 'status' in caught && Number(caught.status) === 401) || String(error.value).includes('Unauthorized')) logout();
  } finally {
    isLoading.value = false;
  }
}

async function saveAccessPolicy(): Promise<void> {
  if (!token.value) return;
  isLoading.value = true; error.value = ''; message.value = '';
  try { accessPolicy.value = await saveAdminAccessPolicy(token.value, accessPolicy.value); message.value = '权益配置已保存，新生成的体验码将使用新配置'; }
  catch (caught) { error.value = caught instanceof Error ? caught.message : '权益配置保存失败'; }
  finally { isLoading.value = false; }
}

async function loadAccessCodes(): Promise<void> {
  if (!token.value) return;
  try {
    accessCodes.value = await listAdminAccessCodes(token.value, { status: codeStatusFilter.value || undefined, query: codeQuery.value || undefined });
    selectedCodeIds.value = [];
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '体验码加载失败';
    if ((caught && typeof caught === 'object' && 'status' in caught && Number(caught.status) === 401) || error.value.toLowerCase().includes('unauthorized') || error.value.includes('未授权')) logout();
  }
}

const allCodesSelected = computed(() => accessCodes.value.length > 0 && accessCodes.value.every((code) => selectedCodeIds.value.includes(code.id)));

function toggleAllCodes(): void {
  selectedCodeIds.value = allCodesSelected.value ? [] : accessCodes.value.map((code) => code.id);
}

function toggleCodeSelection(id: string): void {
  selectedCodeIds.value = selectedCodeIds.value.includes(id)
    ? selectedCodeIds.value.filter((selected) => selected !== id)
    : [...selectedCodeIds.value, id];
}

async function deleteSelectedCodes(): Promise<void> {
  if (!token.value || selectedCodeIds.value.length === 0 || !window.confirm(`确认删除选中的 ${selectedCodeIds.value.length} 个体验码吗？此操作不可恢复。`)) return;
  isLoading.value = true; error.value = ''; message.value = '';
  try { const count = await deleteAdminAccessCodes(token.value, selectedCodeIds.value); message.value = `已删除 ${count} 个体验码`; await loadAccessCodes(); }
  catch (caught) { error.value = caught instanceof Error ? caught.message : '删除失败，请稍后重试'; }
  finally { isLoading.value = false; }
}

function exportCodesCsv(): void {
  const headers = ['体验码', '状态', '已用次数', '总次数', '剩余次数', '有效期至', '订单号', '备注'];
  const rows = accessCodes.value.map((code) => [code.code || `…${code.codeSuffix}`, formatCodeStatus(code.status), code.usedCount, code.maxUses, code.remainingUses, code.expiresAt || '', code.orderReference, code.note]);
  const csv = '\ufeff' + [headers, ...rows].map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = `access-codes-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click(); URL.revokeObjectURL(url);
}

async function generateBatch(): Promise<void> {
  if (!token.value) return;
  isLoading.value = true; error.value = ''; message.value = '';
  try { const batch = await createAdminAccessCodeBatch(token.value, batchSize.value); generatedCodes.value = batch.codes; message.value = '体验码批次已生成'; await loadDashboard(); }
  catch { error.value = '生成失败，请稍后重试'; }
  finally { isLoading.value = false; }
}

async function mutateCode(code: AccessCodeView, action: 'issue' | 'disable' | 'resetBinding' | 'adjustQuota'): Promise<void> {
  if (!token.value) return;
  if (!window.confirm('确认执行此操作吗？')) return;
  isLoading.value = true; error.value = ''; message.value = '';
  try {
    const payload: Parameters<typeof adjustAdminAccessCode>[2] = { action };
    if (action === 'issue' && orderReference.value.trim()) payload.orderReference = orderReference.value.trim();
    if (action === 'adjustQuota') payload.delta = 1;
    await adjustAdminAccessCode(token.value, code.id, payload);
    message.value = '操作成功';
    await loadDashboard();
  } catch { error.value = '操作失败，请稍后重试'; }
  finally { isLoading.value = false; }
}

async function copyCode(code: AccessCodeView): Promise<void> {
  if (!code.code || (code.status !== 'available' && code.status !== 'issued')) return;
  try { await navigator.clipboard.writeText(code.code); message.value = '体验码已复制'; error.value = ''; }
  catch { error.value = '复制失败，请手动复制'; }
}

function formatCodeStatus(status: string): string {
  return ({ available: '可用', issued: '已发放', active: '使用中', disabled: '已禁用', exhausted: '已用尽', expired: '已过期' } as Record<string, string>)[status] || status;
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
  window.location.hash = page === 'api-config' ? '#/admin/api-config' : page === 'access-codes' ? '#/admin/access-codes' : '#/admin/users';
  if (token.value && page === 'access-codes') void loadAccessCodes();
}

function loadToken(): string {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

function getAdminPageFromHash(): AdminPage {
  if (window.location.hash === '#/admin/api-config') return 'api-config';
  if (window.location.hash === '#/admin/access-codes') return 'access-codes';
  return 'users';
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
        <button type="button" class="admin-nav-item" :class="{ active: activePage === 'access-codes' }" @click="setAdminPage('access-codes')">
          <KeyRound :size="18" /><span>体验码管理</span>
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
            <h2>{{ activePage === 'users' ? '用户查询' : activePage === 'api-config' ? 'API 配置' : '体验码管理' }}</h2>
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

        <section v-else-if="activePage === 'api-config'" class="admin-page api-config-page">
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
        <section v-else class="admin-page access-codes-page">
          <section class="admin-policy-panel">
            <div class="admin-table-title"><ShieldCheck :size="18" /><span>体验权益配置</span></div>
            <form class="admin-code-toolbar" @submit.prevent="saveAccessPolicy">
              <label>有效期（天）<input v-model.number="accessPolicy.validDays" type="number" min="1" max="3650" required /></label>
              <label>每码次数<input v-model.number="accessPolicy.maxUses" type="number" min="1" max="1000" required /></label>
              <button type="submit" class="primary-action" :disabled="isLoading"><Save :size="16" /><span>保存权益配置</span></button>
            </form>
            <p class="admin-policy-hint">只影响之后新生成的体验码，已有体验码保持原配置。</p>
          </section>
          <div class="admin-table-wrap">
            <div class="admin-table-title"><KeyRound :size="18" /><span>生成体验码</span></div>
            <div class="admin-code-toolbar">
              <button v-for="size in [10, 50, 100]" :key="size" type="button" class="secondary-action" :data-batch-size="size" :class="{ active: batchSize === size }" @click="batchSize = size as 10 | 50 | 100">{{ size }}</button>
              <button type="button" class="primary-action" data-action="generate-batch" :disabled="isLoading" @click="generateBatch"><Plus :size="16" /><span>生成批次</span></button>
            </div>
            <div v-if="generatedCodes.length" class="generated-code-list">
              <strong>本次生成</strong>
              <code v-for="generatedCode in generatedCodes" :key="generatedCode">{{ generatedCode }}</code>
            </div>
            <div class="admin-code-toolbar">
              <input v-model="codeQuery" data-filter="query" placeholder="搜索后缀 / 订单号" />
              <select v-model="codeStatusFilter" data-filter="status"><option value="">全部状态</option><option value="available">可用</option><option value="issued">已发放</option><option value="disabled">已禁用</option><option value="exhausted">已用尽</option><option value="expired">已过期</option></select>
              <input v-model="orderReference" data-order-reference placeholder="订单号（发放时可选）" />
              <button type="button" class="secondary-action" data-action="filter" @click="loadDashboard">筛选</button>
              <button type="button" class="secondary-action" data-action="export-csv" :disabled="!accessCodes.length" @click="exportCodesCsv">导出 CSV</button>
              <button type="button" class="table-action danger" data-action="delete-selected" :disabled="!selectedCodeIds.length || isLoading" @click="deleteSelectedCodes">删除选中（{{ selectedCodeIds.length }}）</button>
            </div>
            <table class="admin-table"><thead><tr><th><input type="checkbox" :checked="allCodesSelected" aria-label="全选体验码" @change="toggleAllCodes" /></th><th>体验码</th><th>状态</th><th>配额</th><th>日期</th><th>订单号</th><th>操作</th></tr></thead>
              <tbody><tr v-for="code in accessCodes" :key="code.id"><td><input type="checkbox" :checked="selectedCodeIds.includes(code.id)" :aria-label="`选择体验码 ${code.codeSuffix}`" @change="toggleCodeSelection(code.id)" /></td><td>{{ (code.status === 'available' || code.status === 'issued') && code.code ? code.code : `…${code.codeSuffix}` }} <button v-if="code.code && (code.status === 'available' || code.status === 'issued')" type="button" class="table-action" data-action="copy" @click="copyCode(code)">复制</button></td><td>{{ formatCodeStatus(code.status) }}</td><td>{{ code.usedCount }}/{{ code.maxUses }}（余 {{ code.remainingUses }}）</td><td>{{ formatTime(code.issuedAt || code.createdAt) }}<br>{{ formatTime(code.expiresAt || undefined) }}</td><td>{{ code.orderReference || '-' }}</td><td><button v-if="code.status === 'available'" type="button" class="table-action" data-action="issue" :disabled="isLoading" @click="mutateCode(code, 'issue')">发放</button><button v-if="code.status !== 'disabled'" type="button" class="table-action danger" data-action="disable" :disabled="isLoading"><Ban :size="14" />禁用</button><button v-if="code.status === 'issued' || code.status === 'active'" type="button" class="table-action" data-action="reset-binding" :disabled="isLoading" @click="mutateCode(code, 'resetBinding')"><RotateCcw :size="14" />重置绑定</button><button v-if="code.status === 'available' || code.status === 'issued' || code.status === 'active'" type="button" class="table-action" data-action="add-quota" :disabled="isLoading" @click="mutateCode(code, 'adjustQuota')">+1 配额</button></td></tr><tr v-if="accessCodes.length === 0"><td colspan="7">暂无体验码</td></tr></tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  </main>
</template>

<style scoped>
.admin-code-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin: 14px 0;
}

.admin-code-toolbar input,
.admin-code-toolbar select {
  min-width: 0;
  min-height: 40px;
  padding: 8px 10px;
  border: 1px solid #d8d3ca;
  border-radius: 6px;
  background: #fff;
}

.admin-code-toolbar .active {
  border-color: #9f3028;
  color: #9f3028;
}

.generated-code-list {
  display: grid;
  gap: 6px;
  max-height: 220px;
  margin: 12px 0 18px;
  padding: 12px;
  overflow: auto;
  border-left: 3px solid #9f3028;
  background: #f7f6f2;
}

.generated-code-list code {
  overflow-wrap: anywhere;
}
</style>
