<script setup lang="ts">
import { CircleGauge, Sparkles, TrendingUp } from 'lucide-vue-next';
import NumberBall from './NumberBall.vue';
import type { LuckyLotteryResult } from '../domain/lottery';

defineProps<{
  result: LuckyLotteryResult;
}>();
</script>

<template>
  <section class="fortune-board">
    <div class="board-head">
      <div>
        <p class="eyebrow">DOUBLE COLOR BALL</p>
        <h2>今日灵感号</h2>
      </div>
      <div class="score-ring" :style="{ '--score': `${result.score}%` }">
        <span>{{ result.score }}</span>
      </div>
    </div>

    <div class="number-section">
      <div class="section-title">
        <Sparkles :size="17" />
        <span>红球</span>
      </div>
      <div class="ball-row">
        <NumberBall v-for="ball in result.reds" :key="`red-${ball.value}`" :ball="ball" tone="red" />
      </div>
    </div>

    <div class="number-section blue-section">
      <div class="section-title">
        <TrendingUp :size="17" />
        <span>蓝球</span>
      </div>
      <div class="ball-row">
        <NumberBall :ball="result.blue" tone="blue" />
      </div>
    </div>

    <div class="insight-strip">
      <div>
        <CircleGauge :size="17" />
        <span>{{ result.summary }}</span>
      </div>
      <div class="element-chips" aria-label="喜用五行">
        <span v-for="element in result.luckyElements" :key="element">{{ element }}</span>
      </div>
    </div>

    <p class="fortune-advice">{{ result.advice }}</p>
  </section>
</template>
