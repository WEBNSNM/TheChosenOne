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
  commercialMode?: boolean;
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
      <button v-if="!commercialMode" type="button" class="primary-action inspiration-action" @click="emit('submit')">
        <WandSparkles :size="18" />
        <span>生成灵感</span>
      </button>
      <button type="button" class="chart-entry-card" @click="emit('openChart')">
        <span>
          <SlidersHorizontal :size="18" />
          {{ commercialMode ? '编辑成长档案' : '输入/修改命盘' }}
        </span>
        <small>{{ commercialMode ? '现实背景为主，传统历法信息选填' : '出生信息与深度报告' }}</small>
      </button>
      <FortuneBoard v-if="!commercialMode" :result="result" />
      <PremiumReportPreview :form="modelValue" :commercial-mode="commercialMode" @open-consultation="emit('openConsultation')" />
      <SharePosterCard v-if="!commercialMode && result" :result="result" :target-date="modelValue.targetDate" />
      <p v-if="commercialMode" class="inline-notice">本工具提供个人成长反思与行动规划，不构成确定性预测，也不替代医疗、法律或投资等专业建议。</p>
    </section>
  </main>
</template>
