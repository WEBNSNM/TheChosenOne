<script setup lang="ts">
import { computed } from 'vue';
import { BadgeCheck, CircleAlert, SlidersHorizontal } from 'lucide-vue-next';
import { getChartCalibrationItems } from '../domain/premiumReport';
import type { LotteryInput } from '../domain/lottery';

const props = defineProps<{
  form: LotteryInput;
}>();

const emit = defineEmits<{
  improve: [];
}>();

const items = computed(() => getChartCalibrationItems(props.form));
const hasPending = computed(() => items.value.some((item) => item.tone === 'pending'));
</script>

<template>
  <section class="calibration-card">
    <div class="calibration-head">
      <div>
        <p class="eyebrow">CHART CHECK</p>
        <h2>命盘校准状态</h2>
      </div>
      <SlidersHorizontal :size="23" />
    </div>

    <div class="calibration-grid" aria-label="命盘校准状态">
      <div
        v-for="item in items"
        :key="item.label"
        class="calibration-item"
        :class="item.tone"
      >
        <component :is="item.tone === 'pending' ? CircleAlert : BadgeCheck" :size="17" />
        <div>
          <span>{{ item.label }}</span>
          <strong>{{ item.status }}</strong>
          <small>{{ item.detail }}</small>
        </div>
      </div>
    </div>

    <button v-if="hasPending" type="button" class="secondary-action calibration-action" @click="emit('improve')">
      <SlidersHorizontal :size="18" />
      <span>完善校准</span>
    </button>
  </section>
</template>
