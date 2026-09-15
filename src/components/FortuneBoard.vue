<script setup lang="ts">
import { computed } from 'vue';
import { CircleGauge, Sparkles, TrendingUp } from 'lucide-vue-next';
import NumberBall from './NumberBall.vue';
import type { LuckyLotteryResult } from '../domain/lottery';

const props = defineProps<{
  result: LuckyLotteryResult | null;
}>();

const placeholderReds = Array.from({ length: 6 }, () => null);
const hasResult = computed(() => Boolean(props.result));
</script>

<template>
  <section class="fortune-board">
    <div class="board-head">
      <div>
        <p class="eyebrow">FLOW DAY NUMBERS</p>
        <h2>今日灵感数字</h2>
      </div>
      <div class="score-ring" :style="{ '--score': hasResult ? `${result!.score}%` : '0%' }">
        <span>{{ hasResult ? result!.score : '?' }}</span>
      </div>
    </div>

    <div class="number-section">
      <div class="section-title">
        <Sparkles :size="17" />
        <span>红球</span>
      </div>
      <div class="ball-row">
        <template v-if="hasResult">
          <NumberBall v-for="ball in result!.reds" :key="`red-${ball.value}`" :ball="ball" tone="red" />
        </template>
        <template v-else>
          <span v-for="(_, i) in placeholderReds" :key="`ph-red-${i}`" class="number-ball red placeholder">?</span>
        </template>
      </div>
    </div>

    <div class="number-section blue-section">
      <div class="section-title">
        <TrendingUp :size="17" />
        <span>蓝球</span>
      </div>
      <div class="ball-row">
        <NumberBall v-if="hasResult" :ball="result!.blue" tone="blue" />
        <span v-else class="number-ball blue placeholder">?</span>
      </div>
    </div>

    <div class="insight-strip">
      <div>
        <CircleGauge :size="17" />
        <span>{{ hasResult ? result!.summary : '填写成长档案后生成你的专属灵感' }}</span>
      </div>
      <div v-if="hasResult" class="element-chips" aria-label="喜用五行">
        <span v-for="element in result!.luckyElements" :key="element">{{ element }}</span>
      </div>
    </div>

    <p class="fortune-advice">{{ hasResult ? result!.advice : '点击上方「编辑成长档案」开始' }}</p>
  </section>
</template>
