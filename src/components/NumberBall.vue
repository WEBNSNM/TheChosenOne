<script setup lang="ts">
import { computed } from 'vue';
import type { ElementName } from '../domain/bazi';
import type { LotteryBall } from '../domain/lottery';

const props = defineProps<{
  ball: LotteryBall;
  tone: 'red' | 'blue';
}>();

const elementClasses: Record<ElementName, string> = {
  木: 'wood',
  火: 'fire',
  土: 'earth',
  金: 'metal',
  水: 'water',
};

const paddedValue = computed(() => String(props.ball.value).padStart(2, '0'));
const elementClass = computed(() => `element-${elementClasses[props.ball.element]}`);
</script>

<template>
  <span class="number-ball" :class="[tone, elementClass]" :title="`${ball.element} · ${ball.score}`">
    <strong>{{ paddedValue }}</strong>
    <small>{{ ball.element }}</small>
  </span>
</template>
