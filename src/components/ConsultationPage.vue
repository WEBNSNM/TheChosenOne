<script setup lang="ts">
import ConsultationHub from './ConsultationHub.vue';
import type { LotteryInput, LuckyLotteryResult } from '../domain/lottery';

defineProps<{
  result: LuckyLotteryResult | null;
  form: LotteryInput;
}>();

</script>

<template>
  <main class="consultation-page">
    <section class="result-stack consultation-stack" aria-live="polite">
      <ConsultationHub :result="result" :form="form" />
    </section>
  </main>
</template>
