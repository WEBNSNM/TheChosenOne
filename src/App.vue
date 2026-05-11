<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { CalendarDays, Sparkles, TicketCheck } from 'lucide-vue-next';
import DailyFortuneCard from './components/DailyFortuneCard.vue';
import FortuneBoard from './components/FortuneBoard.vue';
import FortuneForm from './components/FortuneForm.vue';
import PillarGrid from './components/PillarGrid.vue';
import { loadSavedForm, saveForm } from './domain/formStorage';
import { generateLuckyLottery, type LotteryInput, type LuckyLotteryResult } from './domain/lottery';

const defaultForm: LotteryInput = {
  birthDate: '1992-08-08',
  birthTime: '08:30',
  birthCalendar: 'solar',
  birthLeapMonth: false,
  targetDate: formatDate(new Date()),
  strategy: 'balance',
  luckyNumbers: [],
};

const form = ref<LotteryInput>(loadSavedForm(defaultForm));
const result = ref<LuckyLotteryResult>(generateLuckyLottery(form.value));
const error = ref('');

const transitLine = computed(() => result.value.profile.transit.pillars.map((pillar) => pillar.label).join(' · '));

watch(
  form,
  (value) => {
    saveForm(value);
  },
  { deep: true },
);

function generate(): void {
  try {
    result.value = generateLuckyLottery(form.value);
    error.value = '';
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '生成失败，请检查输入';
  }
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
        <div class="date-pill">
          <CalendarDays :size="16" />
          <span>{{ form.targetDate }}</span>
        </div>
      </nav>

      <section class="hero-copy">
        <p class="kicker">BAZI DAILY FORTUNE</p>
        <h1>天选流日灵感</h1>
        <p class="hero-lead">
          以生辰四柱、当日流气与五行取象，生成一组红蓝灵感数字。
        </p>
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

    <main class="workspace">
      <FortuneForm v-model="form" @submit="generate" />

      <section class="result-stack" aria-live="polite">
        <p v-if="error" class="error-banner">{{ error }}</p>
        <DailyFortuneCard :fortune="result.dailyFortune" />
        <FortuneBoard :result="result" />

        <div class="pillar-layout">
          <PillarGrid title="本命四柱" :set="result.profile.birth" />
          <PillarGrid title="流日三柱" :set="result.profile.transit" compact />
        </div>
      </section>
    </main>

    <footer class="footer-note">
      <TicketCheck :size="16" />
      <span>仅供娱乐与灵感参考，数字结果请理性看待。</span>
    </footer>
  </div>
</template>
