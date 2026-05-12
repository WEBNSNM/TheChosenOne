<script setup lang="ts">
import { AlertTriangle, CheckCircle2, Compass, ShieldCheck } from 'lucide-vue-next';
import type { DailyFortuneResult } from '../domain/fortune';

defineProps<{
  fortune: DailyFortuneResult;
}>();
</script>

<template>
  <section class="daily-card">
    <div class="daily-head">
      <div>
        <p class="eyebrow">TODAY FORTUNE</p>
        <h2>今日吉凶</h2>
      </div>
      <div class="fortune-badge" :class="fortune.level">
        <strong>{{ fortune.label }}</strong>
        <span>{{ fortune.score }}</span>
      </div>
    </div>

    <p class="daily-summary">{{ fortune.summary }}</p>
    <p class="personal-focus">{{ fortune.personalFocus }}</p>

    <div class="daily-columns">
      <div class="daily-column">
        <div class="section-title">
          <CheckCircle2 :size="17" />
          <span>适合</span>
        </div>
        <div class="tag-list good-tags">
          <span v-for="item in fortune.suitable" :key="item">{{ item }}</span>
        </div>
      </div>

      <div class="daily-column">
        <div class="section-title">
          <AlertTriangle :size="17" />
          <span>谨慎</span>
        </div>
        <div class="tag-list caution-tags">
          <span v-for="item in fortune.avoid" :key="item">{{ item }}</span>
        </div>
      </div>
    </div>

    <div class="almanac-grid">
      <span>
        <Compass :size="15" />
        {{ fortune.almanac.tianShen }} · {{ fortune.almanac.tianShenType }}
      </span>
      <span>
        <ShieldCheck :size="15" />
        {{ fortune.almanac.zhiXing }}日 · 冲{{ fortune.almanac.clash }}
      </span>
      <span>农历 {{ fortune.profile.targetInfo.lunarDateText }}</span>
      <span>生日换算 {{ fortune.profile.birthInfo.solarDate }}</span>
    </div>
  </section>
</template>
