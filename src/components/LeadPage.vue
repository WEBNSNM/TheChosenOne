<script setup lang="ts">
import { WandSparkles, SlidersHorizontal } from 'lucide-vue-next';
import FortuneBoard from './FortuneBoard.vue';
import PremiumReportPreview from './PremiumReportPreview.vue';
import SharePosterCard from './SharePosterCard.vue';
import type { LotteryInput, LuckyLotteryResult } from '../domain/lottery';

defineProps<{
  modelValue: LotteryInput;
  result: LuckyLotteryResult | null;
  error: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: LotteryInput];
  submit: [];
  openChart: [];
  openConsultation: [];
}>();
</script>

<template>
  <main class="lead-page">
    <section class="result-stack lead-result" aria-live="polite">
      <p v-if="error" class="error-banner">{{ error }}</p>
      <button type="button" class="primary-action inspiration-action" @click="emit('submit')">
        <WandSparkles :size="18" />
        <span>生成灵感</span>
      </button>
      <button type="button" class="chart-entry-card" @click="emit('openChart')">
        <span>
          <SlidersHorizontal :size="18" />
          输入/修改命盘
        </span>
        <small>出生信息与深度报告</small>
      </button>
      <FortuneBoard :result="result" />
      <PremiumReportPreview :form="modelValue" @open-consultation="emit('openConsultation')" />
      <SharePosterCard v-if="result" :result="result" :target-date="modelValue.targetDate" />
    </section>
  </main>
</template>
