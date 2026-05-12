<script setup lang="ts">
import { ArrowLeft, Crown, Sparkles } from 'lucide-vue-next';
import ConsultationHub from './ConsultationHub.vue';
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

    <section class="result-stack consultation-stack" aria-live="polite">
      <section class="consultation-summary-card">
        <div class="consultation-summary-head">
          <div>
            <p class="eyebrow">CURRENT CHART</p>
            <h2>当前命盘摘要</h2>
          </div>
          <div class="fortune-badge" :class="result.dailyFortune.level">
            <strong>{{ result.dailyFortune.label }}</strong>
            <span>{{ result.dailyFortune.score }}</span>
          </div>
        </div>

        <div class="summary-chip-row" aria-label="当前命盘摘要">
          <span>日主 {{ result.profile.dayMaster.stem }}{{ result.profile.dayMaster.element }}</span>
          <span>流日 {{ result.profile.transit.day.label }}</span>
          <span>{{ form.birthPlace?.trim() || '未填出生地' }}</span>
          <span>{{ form.useTrueSolarTime ? '真太阳时已开' : '未启用真太阳时' }}</span>
        </div>

        <p class="summary-focus">{{ result.dailyFortune.personalFocus }}</p>

        <details class="consultation-detail-drawer">
          <summary>
            <Sparkles :size="17" />
            <span>查看命盘细节</span>
          </summary>
          <div class="summary-detail-grid">
            <div class="summary-detail-block">
              <strong>本命四柱</strong>
              <span>{{ result.profile.birth.pillars.map((pillar) => pillar.label).join(' · ') }}</span>
            </div>
            <div class="summary-detail-block">
              <strong>流日三柱</strong>
              <span>{{ result.profile.transit.pillars.map((pillar) => pillar.label).join(' · ') }}</span>
            </div>
            <div class="summary-detail-block">
              <strong>今日适合</strong>
              <span>{{ result.dailyFortune.suitable.slice(0, 4).join('、') }}</span>
            </div>
          </div>
        </details>
      </section>

      <section class="consultation-anchor compact-anchor">
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
