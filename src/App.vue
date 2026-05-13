<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { CalendarDays, Maximize2, Sparkles, TicketCheck, X } from 'lucide-vue-next';
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
const isHeroDetailOpen = ref(false);

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
  isHeroDetailOpen.value = false;

  const hash = page === 'consultation' ? '#consultation' : '#numbers';
  if (window.location.hash !== hash) {
    window.location.hash = hash;
  }
}

function syncPageFromHash(): void {
  currentPage.value = getPageFromHash();
  isHeroDetailOpen.value = false;
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
    <header class="hero" :class="{ 'consultation-hero': currentPage === 'consultation' }">
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
        <div v-if="currentPage === 'consultation'" class="hero-consultation-panel" aria-label="深度流日咨询摘要">
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

        <div v-else class="hero-metrics" aria-label="今日流日">
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
        v-if="isHeroDetailOpen"
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
      @submit="generate"
      @open-consultation="setPage('consultation')"
    />
    <ConsultationPage v-else :result="result" :form="form" />

    <footer class="footer-note">
      <TicketCheck :size="16" />
      <span>仅供娱乐与灵感参考，数字结果请理性看待。</span>
    </footer>
  </div>
</template>
