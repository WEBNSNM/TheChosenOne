<script setup lang="ts">
import { computed } from 'vue';
import { ELEMENTS, type ElementName, type PillarSet } from '../domain/bazi';

const props = defineProps<{
  title: string;
  set: PillarSet;
  compact?: boolean;
}>();

const labels = ['年柱', '月柱', '日柱', '时柱'];
const rows = computed(() => props.set.pillars.map((pillar, index) => ({
  label: labels[index],
  pillar,
})));
const maxCount = computed(() => Math.max(1, ...Object.values(props.set.elementCounts)));

function getBarWidth(element: ElementName): string {
  return `${Math.round((props.set.elementCounts[element] / maxCount.value) * 100)}%`;
}
</script>

<template>
  <section class="pillar-card" :class="{ compact }">
    <div class="pillar-head">
      <p class="eyebrow">{{ compact ? 'TRANSIT' : 'NATAL' }}</p>
      <h2>{{ title }}</h2>
    </div>

    <div class="pillar-grid">
      <div v-for="row in rows" :key="row.label" class="pillar-item">
        <span>{{ row.label }}</span>
        <strong>{{ row.pillar.label }}</strong>
        <em>{{ row.pillar.element }}</em>
      </div>
    </div>

    <div class="element-bars">
      <div v-for="element in ELEMENTS" :key="element" class="element-row">
        <span>{{ element }}</span>
        <div class="bar-track">
          <i :style="{ width: getBarWidth(element) }"></i>
        </div>
        <strong>{{ set.elementCounts[element] }}</strong>
      </div>
    </div>
  </section>
</template>
