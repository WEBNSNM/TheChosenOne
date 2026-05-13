<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { SlidersHorizontal, X } from 'lucide-vue-next';
import FortuneBoard from './FortuneBoard.vue';
import FortuneForm from './FortuneForm.vue';
import PremiumReportPreview from './PremiumReportPreview.vue';
import SharePosterCard from './SharePosterCard.vue';
import type { LotteryInput, LuckyLotteryResult } from '../domain/lottery';

const props = defineProps<{
  modelValue: LotteryInput;
  result: LuckyLotteryResult | null;
  error: string;
  promptChart?: boolean;
}>();

watch(() => props.promptChart, (value) => {
  if (value) isChartModalOpen.value = true;
});

const emit = defineEmits<{
  'update:modelValue': [value: LotteryInput];
  submit: [];
  openConsultation: [];
}>();

const formProxy = computed({
  get: () => props.modelValue,
  set: (value: LotteryInput) => emit('update:modelValue', value),
});

const isChartModalOpen = ref(false);

function openChartModal(): void {
  isChartModalOpen.value = true;
}

function closeChartModal(): void {
  isChartModalOpen.value = false;
}

function submitChart(): void {
  emit('submit');
  closeChartModal();
}
</script>

<template>
  <main class="lead-page">
    <section class="result-stack lead-result" aria-live="polite">
      <p v-if="error" class="error-banner">{{ error }}</p>
      <button type="button" class="chart-entry-card" @click="openChartModal">
        <span>
          <SlidersHorizontal :size="18" />
          输入/修改命盘
        </span>
        <small>出生信息与深度报告</small>
      </button>
      <FortuneBoard :result="result" />
      <SharePosterCard v-if="result" :result="result" :target-date="modelValue.targetDate" />
    </section>

    <Teleport to="body">
      <div v-if="isChartModalOpen" class="chart-modal" role="dialog" aria-modal="true" aria-label="输入命盘" @click.self="closeChartModal">
        <div class="chart-modal-shell">
          <div class="chart-modal-head">
            <div>
              <p class="eyebrow">PERSONAL CHART</p>
              <h2>输入命盘</h2>
            </div>
            <button type="button" class="chart-modal-close" aria-label="关闭输入命盘" @click="closeChartModal">
              <X :size="18" />
            </button>
          </div>

          <div class="chart-modal-body">
            <FortuneForm v-model="formProxy" @submit="submitChart" />
            <PremiumReportPreview :form="modelValue" @open-consultation="emit('openConsultation')" />
          </div>
        </div>
      </div>
    </Teleport>
  </main>
</template>
