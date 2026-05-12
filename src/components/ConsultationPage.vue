<script setup lang="ts">
import { ArrowLeft, Crown, Sparkles } from 'lucide-vue-next';
import ConsultationHub from './ConsultationHub.vue';
import DailyFortuneCard from './DailyFortuneCard.vue';
import PillarGrid from './PillarGrid.vue';
import PremiumReportPreview from './PremiumReportPreview.vue';
import SharePosterCard from './SharePosterCard.vue';
import type { LotteryInput, LuckyLotteryResult } from '../domain/lottery';

defineProps<{
  result: LuckyLotteryResult;
  form: LotteryInput;
}>();

const emit = defineEmits<{
  openLead: [];
}>();
</script>

<template>
  <main class="consultation-page">
    <section class="paid-intro-card">
      <div class="paid-intro-copy">
        <p class="eyebrow">DEEP READING</p>
        <h2>深度流日解读</h2>
        <p>
          围绕今天适合做什么、需要放缓什么，以及关系、工作和个人节奏继续追问，得到更完整的个人解读。
        </p>
      </div>

      <div class="paid-intro-actions">
        <button type="button" class="secondary-action" @click="emit('openLead')">
          <ArrowLeft :size="18" />
          <span>返回灵感入口</span>
        </button>
        <div class="paid-pill">
          <Crown :size="16" />
          <span>深度解读</span>
        </div>
      </div>
    </section>

    <section class="result-stack" aria-live="polite">
      <DailyFortuneCard :fortune="result.dailyFortune" />

      <div class="pillar-layout">
        <PillarGrid title="命盘五行" :set="result.profile.birth" />
        <PillarGrid title="流日三柱" :set="result.profile.transit" compact />
      </div>

      <SharePosterCard :result="result" :target-date="form.targetDate" />

      <PremiumReportPreview :form="form" :show-action="false" />

      <section class="consultation-anchor">
        <div>
          <p class="eyebrow">AI SERVICE</p>
          <h2>选择一个你最关心的问题</h2>
        </div>
        <Sparkles :size="23" />
      </section>

      <ConsultationHub :result="result" :form="form" />
    </section>
  </main>
</template>
