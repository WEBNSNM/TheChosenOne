<script setup lang="ts">
import { computed, ref } from 'vue';
import ChartCalibrationCard from './ChartCalibrationCard.vue';
import FortuneBoard from './FortuneBoard.vue';
import FortuneForm from './FortuneForm.vue';
import PremiumReportPreview from './PremiumReportPreview.vue';
import SharePosterCard from './SharePosterCard.vue';
import type { LotteryInput, LuckyLotteryResult } from '../domain/lottery';

const props = defineProps<{
  modelValue: LotteryInput;
  result: LuckyLotteryResult;
  error: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: LotteryInput];
  submit: [];
  openConsultation: [];
}>();

const formProxy = computed({
  get: () => props.modelValue,
  set: (value: LotteryInput) => emit('update:modelValue', value),
});

const formAnchor = ref<HTMLElement | null>(null);

function scrollToForm(): void {
  formAnchor.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
</script>

<template>
  <main class="workspace lead-page">
    <div ref="formAnchor" class="form-anchor">
      <FortuneForm v-model="formProxy" @submit="emit('submit')" />
    </div>

    <section class="result-stack lead-result" aria-live="polite">
      <p v-if="error" class="error-banner">{{ error }}</p>
      <FortuneBoard :result="result" />
      <SharePosterCard :result="result" :target-date="modelValue.targetDate" />
      <ChartCalibrationCard :form="modelValue" @improve="scrollToForm" />
      <PremiumReportPreview :form="modelValue" @open-consultation="emit('openConsultation')" />
    </section>
  </main>
</template>
