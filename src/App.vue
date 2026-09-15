<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { CalendarDays, Maximize2, Sparkles, TicketCheck, X } from 'lucide-vue-next';
import AdminApp from './components/AdminApp.vue';
import AccessGate from './components/AccessGate.vue';
import ChartSetupModal from './components/ChartSetupModal.vue';
import ConsultationPage from './components/ConsultationPage.vue';
import EntitlementStatus from './components/EntitlementStatus.vue';
import LeadPage from './components/LeadPage.vue';
import { BackendClientError, getAccessConfig, getAccessMe, getClientId, logoutAccess, submitChart, type AccessConfig, type AccessEntitlement } from './domain/backendClient';
import {
  isChartComplete,
  getChartMissingHint,
  isGrowthProfileComplete,
  isUserProfileFilled,
  type UserProfile,
} from './domain/consultation';
import { loadUserProfile, saveUserProfile } from './domain/deepseekSettings';
import { loadSavedForm, saveForm } from './domain/formStorage';
import { generateLuckyLottery, type LotteryInput, type LuckyLotteryResult } from './domain/lottery';
import { isCommercialMode } from './domain/runtimeConfig';

type AppPage = 'numbers' | 'consultation' | 'admin';

const defaultForm: LotteryInput = {
  customerName: '',
  birthDate: '',
  birthTime: '',
  birthCalendar: 'solar',
  birthLeapMonth: false,
  gender: 'unspecified',
  birthPlace: '',
  useTrueSolarTime: false,
  birthTimeAccuracy: 'approximate',
  targetDate: formatDate(new Date()),
  strategy: 'balance',
  luckyNumbers: [],
};

const form = ref<LotteryInput>(loadSavedForm(defaultForm));
const userProfile = ref<UserProfile>(loadUserProfile());
const result = ref<LuckyLotteryResult | null>(tryGenerate(form.value));
const error = ref('');
const currentPage = ref<AppPage>(getPageFromHash());
const commercialMode = isCommercialMode();
const isHeroDetailOpen = ref(false);
const isSetupModalOpen = ref(false);
const setupModalIncludesProfile = ref(false);
const setupModalRequiresProfile = ref(false);
const entitlement = ref<AccessEntitlement | null>(null);
const accessConfig = ref<AccessConfig>({ maxUses: 10, validDays: 7 });
const logoutError = ref('');
const entitlementError = ref('');
const isEntitlementLoading = ref(commercialMode && currentPage.value !== 'admin');
let entitlementRequestGeneration = 0;
let isLoggingOut = false;
const workspaceLocked = computed(() => {
  const status = entitlement.value?.status;
  return status === 'expired' || status === 'exhausted' || status === 'disabled' || entitlement.value?.remainingUses === 0;
});

const transitLine = computed(() => {
  return result.value?.profile.transit.pillars.map((pillar) => pillar.label).join(' · ') ?? '';
});
const heroCopy = computed(() => {
  if (commercialMode) {
    return currentPage.value === 'consultation'
      ? {
          kicker: 'AI GROWTH INSIGHT',
          title: '个人成长洞察报告',
          lead: '从你的职业、关注重点、目标和当前困难出发，整理能力倾向、阶段观察与行动建议。',
        }
      : {
          kicker: 'PERSONAL GROWTH PROFILE',
          title: '理清当下，再决定下一步',
          lead: '传统历法文化 × AI 的个人成长洞察工具。现实背景是主要依据，文化信息仅作可选参考。',
        };
  }

  if (currentPage.value === 'consultation') {
    return {
      kicker: 'AI DAILY READING',
      title: '深度流日咨询',
      lead: '从今日流日、命盘五行和你的具体问题出发，生成一份更完整的行动解读。',
    };
  }

  return {
    kicker: 'BAZI DAILY INSPIRATION',
    title: '今日红蓝灵感',
    lead: '用生辰四柱、当日流气与五行取象，生成一组属于今天的红蓝灵感。',
  };
});

watch(
  form,
  (value) => {
    saveForm(value);
  },
  { deep: true },
);

watch(
  userProfile,
  (value) => {
    saveUserProfile(value);
  },
  { deep: true },
);

onMounted(() => {
  window.addEventListener('hashchange', syncPageFromHash);
  window.addEventListener('focus', refreshEntitlement);
  document.addEventListener('visibilitychange', refreshEntitlementWhenVisible);
  if (commercialMode) {
    void getAccessConfig().then((config) => { accessConfig.value = config; }).catch(() => undefined);
    if (currentPage.value !== 'admin') void restoreEntitlement();
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('hashchange', syncPageFromHash);
  window.removeEventListener('focus', refreshEntitlement);
  document.removeEventListener('visibilitychange', refreshEntitlementWhenVisible);
});

function generate(): void {
  if (workspaceLocked.value) return;
  if (!isChartComplete(form.value)) {
    error.value = getChartMissingHint(form.value) + '，才能生成灵感。';
    openChartSetup();
    return;
  }

  try {
    const generated = generateLuckyLottery(form.value);
    result.value = generated;
    error.value = '';
    closeChartSetup();
    void persistChart(generated);
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '生成失败，请检查输入';
  }
}

function submitSetupModal(): void {
  if (setupModalRequiresProfile.value && !(commercialMode ? isGrowthProfileComplete(userProfile.value) : isUserProfileFilled(userProfile.value))) {
    error.value = '请先补充个人背景，再开始深度解读。';
    return;
  }

  if (commercialMode) {
    result.value = tryGenerate(form.value);
    error.value = '';
    closeChartSetup();
    return;
  }

  generate();
}

function openChartSetup(options: { includeProfile?: boolean; profileRequired?: boolean } = {}): void {
  setupModalIncludesProfile.value = Boolean(options.includeProfile);
  setupModalRequiresProfile.value = Boolean(options.profileRequired);
  isSetupModalOpen.value = true;
}

function closeChartSetup(): void {
  isSetupModalOpen.value = false;
  setupModalIncludesProfile.value = false;
  setupModalRequiresProfile.value = false;
}

async function persistChart(generated: LuckyLotteryResult): Promise<void> {
  try {
    await submitChart({
      clientId: getClientId(),
      displayName: form.value.customerName?.trim() || '',
      form: form.value as unknown as Record<string, unknown>,
      result: generated as unknown as Record<string, unknown>,
    });
  } catch {
    // Backend persistence should not block the local chart experience.
  }
}

function tryGenerate(input: LotteryInput): LuckyLotteryResult | null {
  if (!isChartComplete(input)) return null;

  try {
    return generateLuckyLottery(input);
  } catch {
    return null;
  }
}

function setPage(page: AppPage): void {
  if (workspaceLocked.value && page !== currentPage.value) return;
  currentPage.value = page;
  isHeroDetailOpen.value = false;

  const hash = page === 'consultation' ? '#consultation' : '#numbers';
  if (page === 'admin') return;
  if (window.location.hash !== hash) {
    window.location.hash = hash;
  }
}

function syncPageFromHash(): void {
  currentPage.value = getPageFromHash();
  isHeroDetailOpen.value = false;
  if (commercialMode && currentPage.value !== 'admin' && !entitlement.value) void restoreEntitlement();
}

async function restoreEntitlement(): Promise<void> {
  if (!commercialMode) {
    isEntitlementLoading.value = false;
    return;
  }
  if (currentPage.value === 'admin') {
    isEntitlementLoading.value = false;
    return;
  }
  const requestGeneration = ++entitlementRequestGeneration;
  const wasEntitled = Boolean(entitlement.value);
  isEntitlementLoading.value = !wasEntitled;
  try {
    const access = await getAccessMe();
    if (requestGeneration !== entitlementRequestGeneration || isLoggingOut) return;
    entitlement.value = access;
    entitlementError.value = '';
  } catch (caught) {
    if (requestGeneration !== entitlementRequestGeneration || isLoggingOut) return;
    if (caught instanceof BackendClientError && caught.status === 401) {
      entitlement.value = null;
      entitlementError.value = '';
    } else {
      entitlementError.value = caught instanceof Error ? caught.message : '暂时无法刷新访问权益，请稍后重试。';
    }
  } finally {
    if (requestGeneration === entitlementRequestGeneration && !isLoggingOut) {
      isEntitlementLoading.value = false;
    }
  }
}

function refreshEntitlement(): void {
  if (commercialMode && currentPage.value !== 'admin' && entitlement.value) void restoreEntitlement();
}

function refreshEntitlementWhenVisible(): void {
  if (document.visibilityState === 'visible') refreshEntitlement();
}

async function handleRedeemed(access: AccessEntitlement): Promise<void> {
  entitlement.value = access;
  entitlementError.value = '';
  await restoreEntitlement();
}

async function handleLogout(): Promise<void> {
  logoutError.value = '';
  isLoggingOut = true;
  entitlementRequestGeneration += 1;
  try {
    await logoutAccess();
    entitlement.value = null;
    entitlementError.value = '';
    currentPage.value = 'numbers';
    if (typeof window !== 'undefined' && window.location.hash !== '#numbers') {
      window.location.hash = '#numbers';
    }
    isEntitlementLoading.value = false;
  } catch (caught) {
    logoutError.value = caught instanceof Error ? caught.message : '退出登录失败，请重试。';
  } finally {
    isLoggingOut = false;
  }
}

function getPageFromHash(): AppPage {
  if (typeof window === 'undefined') return 'numbers';

  if (window.location.hash.startsWith('#/admin')) return 'admin';
  return window.location.hash === '#consultation' ? 'consultation' : 'numbers';
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
</script>

<template>
  <AdminApp v-if="currentPage === 'admin'" />
  <div v-else-if="isEntitlementLoading" class="access-loading" role="status" aria-live="polite">
    正在检查访问权限…
  </div>
  <AccessGate v-else-if="commercialMode && !entitlement" :status-message="entitlementError" :max-uses="accessConfig.maxUses" :valid-days="accessConfig.validDays" @redeemed="handleRedeemed" />
  <div v-else class="app-shell" :class="{ 'workspace-locked': workspaceLocked }">
    <header class="hero" :class="{ 'consultation-hero': currentPage === 'consultation' }">
      <nav class="topbar" aria-label="应用信息">
        <div class="brand-mark">
          <Sparkles :size="19" />
          <span>{{ commercialMode ? '个人成长洞察工具' : 'The Chosen One' }}</span>
        </div>
        <div class="topbar-actions">
          <div class="page-tabs" aria-label="页面切换">
            <button
              type="button"
              class="page-tab"
              :disabled="workspaceLocked"
              :class="{ active: currentPage === 'numbers' }"
              :aria-current="currentPage === 'numbers' ? 'page' : undefined"
              @click="setPage('numbers')"
            >
              {{ commercialMode ? '成长档案' : '灵感入口' }}
            </button>
            <button
              type="button"
              class="page-tab"
              :disabled="workspaceLocked"
              :class="{ active: currentPage === 'consultation' }"
              :aria-current="currentPage === 'consultation' ? 'page' : undefined"
              @click="setPage('consultation')"
            >
              {{ commercialMode ? '成长报告' : '深度咨询' }}
            </button>
          </div>
          <div class="date-pill">
            <CalendarDays :size="16" />
            <span>{{ form.targetDate }}</span>
          </div>
        </div>
        <EntitlementStatus v-if="commercialMode && entitlement" :entitlement="entitlement" @logout="handleLogout" />
      </nav>
      <p v-if="logoutError || entitlementError" class="logout-error" role="alert">{{ logoutError || entitlementError }}</p>

      <section class="hero-copy">
        <p class="kicker">{{ heroCopy.kicker }}</p>
        <h1>{{ heroCopy.title }}</h1>
        <p class="hero-lead">{{ heroCopy.lead }}</p>
        <div v-if="!commercialMode && currentPage === 'consultation' && result" class="hero-consultation-panel" aria-label="深度流日咨询摘要">
          <button
            type="button"
            class="hero-detail-toggle"
            aria-label="展开命盘详情"
            @click="isHeroDetailOpen = true"
          >
            <Maximize2 :size="16" />
          </button>
          <div class="hero-fortune-badge" :class="result.dailyFortune.level">
            <strong>{{ result.dailyFortune.label }}</strong>
            <span>{{ result.dailyFortune.score }} 分</span>
          </div>
          <div class="hero-consultation-brief">
            <p>今日适合</p>
            <div class="hero-suitable-tags">
              <span v-for="item in result.dailyFortune.suitable.slice(0, 4)" :key="item">{{ item }}</span>
            </div>
            <small>{{ result.dailyFortune.personalFocus }}</small>
          </div>
        </div>

        <div v-else-if="!commercialMode && result" class="hero-metrics" aria-label="今日流日">
          <span>
            <strong>{{ result.profile.transit.day.label }}</strong>
            流日
          </span>
          <span>
            <strong>{{ transitLine }}</strong>
            三柱
          </span>
          <span>
            <strong>{{ result.score }}</strong>
            气势
          </span>
          <span>
            <strong>{{ result.dailyFortune.label }}</strong>
            吉凶
          </span>
        </div>
      </section>
    </header>

    <Teleport to="body">
      <div
        v-if="isHeroDetailOpen && result"
        class="hero-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-label="深度流日命盘详情"
        @click.self="isHeroDetailOpen = false"
      >
        <div class="hero-detail-shell">
          <div class="hero-detail-head">
            <div>
              <p class="eyebrow">DAILY CHART DETAIL</p>
              <h2>深度流日命盘详情</h2>
            </div>
            <button type="button" class="hero-detail-close" aria-label="关闭命盘详情" @click="isHeroDetailOpen = false">
              <X :size="19" />
            </button>
          </div>

          <div class="hero-detail-body">
            <section class="hero-detail-pillars" aria-label="本命与流日三柱">
              <div class="hero-detail-pillar-card">
                <strong>本命四柱</strong>
                <div class="hero-detail-pillar-row">
                  <span v-for="pillar in result.profile.birth.pillars" :key="`birth-${pillar.label}`">
                    {{ pillar.label }}
                  </span>
                </div>
              </div>
              <div class="hero-detail-pillar-card">
                <strong>流日三柱</strong>
                <div class="hero-detail-pillar-row">
                  <span v-for="pillar in result.profile.transit.pillars" :key="`transit-${pillar.label}`">
                    {{ pillar.label }}
                  </span>
                </div>
              </div>
            </section>

            <section class="hero-detail-highlight">
              <div class="hero-fortune-badge" :class="result.dailyFortune.level">
                <strong>{{ result.dailyFortune.label }}</strong>
                <span>{{ result.dailyFortune.score }} 分</span>
              </div>
              <div>
                <p class="eyebrow">今日吉凶</p>
                <h3>{{ result.dailyFortune.summary }}</h3>
                <p>{{ result.dailyFortune.personalFocus }}</p>
              </div>
            </section>

            <section class="hero-detail-grid" aria-label="命盘基础信息">
              <div class="hero-detail-card">
                <strong>日主</strong>
                <span>{{ result.profile.dayMaster.stem }}{{ result.profile.dayMaster.element }}</span>
              </div>
              <div class="hero-detail-card">
                <strong>出生信息</strong>
                <span>{{ form.birthPlace?.trim() || '未填出生地' }} · {{ form.useTrueSolarTime ? '真太阳时已开' : '未启用真太阳时' }}</span>
              </div>
            </section>

            <section class="hero-detail-list suitable">
              <strong>今日适合</strong>
              <div>
                <span v-for="item in result.dailyFortune.suitable" :key="item">{{ item }}</span>
              </div>
            </section>

            <section class="hero-detail-list avoid">
              <strong>今日忌讳</strong>
              <div>
                <span v-for="item in result.dailyFortune.avoid" :key="item">{{ item }}</span>
              </div>
            </section>
          </div>
        </div>
      </div>
    </Teleport>

    <LeadPage
      v-if="currentPage === 'numbers'"
      v-model="form"
      :result="result"
      :error="error"
      :commercial-mode="commercialMode"
      @submit="generate"
      @open-chart="openChartSetup"
      @open-consultation="setPage('consultation')"
    />
    <ConsultationPage
      v-else
      :result="result"
      :form="form"
      v-model:user-profile="userProfile"
      :locked="workspaceLocked"
      :commercial-mode="commercialMode"
      @request-setup="openChartSetup"
      @report-generated="refreshEntitlement"
    />

    <ChartSetupModal
      v-if="isSetupModalOpen"
      v-model="form"
      v-model:user-profile="userProfile"
      :profile-required="setupModalRequiresProfile"
      :commercial-mode="commercialMode"
      @close="closeChartSetup"
      @submit="submitSetupModal"
    />

    <footer class="footer-note">
      <TicketCheck :size="16" />
      <span>{{ commercialMode
        ? '用于个人成长反思与行动规划；传统历法信息仅作文化参考，不构成确定性预测，也不替代医疗、法律或投资等专业建议。'
        : '仅供娱乐与灵感参考，数字结果请理性看待。' }}</span>
    </footer>
    <div v-if="workspaceLocked" class="workspace-lock-banner" role="alert">
      当前权益无法继续生成或切换内容，请查看上方状态或联系支持。
    </div>
  </div>
</template>
