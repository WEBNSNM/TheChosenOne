<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { CalendarDays, Sparkles, TicketCheck } from 'lucide-vue-next';
import ConsultationPage from './components/ConsultationPage.vue';
import LeadPage from './components/LeadPage.vue';
import { loadSavedForm, saveForm } from './domain/formStorage';
import { generateLuckyLottery, type LotteryInput, type LuckyLotteryResult } from './domain/lottery';

type AppPage = 'numbers' | 'consultation';

const defaultForm: LotteryInput = {
  birthDate: '1992-08-08',
  birthTime: '08:30',
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
const result = ref<LuckyLotteryResult>(generateLuckyLottery(form.value));
const error = ref('');
const currentPage = ref<AppPage>(getPageFromHash());

const transitLine = computed(() => result.value.profile.transit.pillars.map((pillar) => pillar.label).join(' · '));
const heroCopy = computed(() => {
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

onMounted(() => {
  window.addEventListener('hashchange', syncPageFromHash);
});

onBeforeUnmount(() => {
  window.removeEventListener('hashchange', syncPageFromHash);
});

function generate(): void {
  try {
    result.value = generateLuckyLottery(form.value);
    error.value = '';
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '生成失败，请检查输入';
  }
}

function setPage(page: AppPage): void {
  currentPage.value = page;

  const hash = page === 'consultation' ? '#consultation' : '#numbers';
  if (window.location.hash !== hash) {
    window.location.hash = hash;
  }
}

function syncPageFromHash(): void {
  currentPage.value = getPageFromHash();
}

function getPageFromHash(): AppPage {
  if (typeof window === 'undefined') return 'numbers';

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
  <div class="app-shell">
    <header class="hero">
      <nav class="topbar" aria-label="应用信息">
        <div class="brand-mark">
          <Sparkles :size="19" />
          <span>The Chosen One</span>
        </div>
        <div class="topbar-actions">
          <div class="page-tabs" aria-label="页面切换">
            <button
              type="button"
              class="page-tab"
              :class="{ active: currentPage === 'numbers' }"
              :aria-current="currentPage === 'numbers' ? 'page' : undefined"
              @click="setPage('numbers')"
            >
              灵感入口
            </button>
            <button
              type="button"
              class="page-tab"
              :class="{ active: currentPage === 'consultation' }"
              :aria-current="currentPage === 'consultation' ? 'page' : undefined"
              @click="setPage('consultation')"
            >
              深度咨询
            </button>
          </div>
          <div class="date-pill">
            <CalendarDays :size="16" />
            <span>{{ form.targetDate }}</span>
          </div>
        </div>
      </nav>

      <section class="hero-copy">
        <p class="kicker">{{ heroCopy.kicker }}</p>
        <h1>{{ heroCopy.title }}</h1>
        <p class="hero-lead">{{ heroCopy.lead }}</p>
        <div class="hero-metrics" aria-label="今日流日">
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

    <LeadPage
      v-if="currentPage === 'numbers'"
      v-model="form"
      :result="result"
      :error="error"
      @submit="generate"
      @open-consultation="setPage('consultation')"
    />
    <ConsultationPage v-else :result="result" :form="form" @open-lead="setPage('numbers')" />

    <footer class="footer-note">
      <TicketCheck :size="16" />
      <span>仅供娱乐与灵感参考，数字结果请理性看待。</span>
    </footer>
  </div>
</template>
