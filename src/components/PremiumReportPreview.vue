<script setup lang="ts">
import { computed } from 'vue';
import { ChevronRight, Crown, FileText, LockKeyhole, Sparkles } from 'lucide-vue-next';
import {
  getPremiumReadiness,
  getPremiumReportSections,
} from '../domain/premiumReport';
import type { LotteryInput } from '../domain/lottery';

const props = withDefaults(defineProps<{
  form: LotteryInput;
  showAction?: boolean;
}>(), {
  showAction: true,
});

const emit = defineEmits<{
  openConsultation: [];
}>();

const readiness = computed(() => getPremiumReadiness(props.form));
const sections = getPremiumReportSections();
</script>

<template>
  <section class="premium-preview-card">
    <div class="premium-preview-head">
      <div>
        <p class="eyebrow">PAID REPORT</p>
        <h2>深度命盘报告</h2>
      </div>
      <Crown :size="23" />
    </div>

    <p class="premium-readiness" :class="{ ready: readiness.isReady }">
      <Sparkles :size="17" />
      <span>{{ readiness.message }}</span>
    </p>

    <div class="report-section-list" aria-label="深度报告目录">
      <article v-for="section in sections" :key="section.title" class="report-section-item">
        <div class="report-section-icon">
          <FileText :size="18" />
        </div>
        <div>
          <h3>{{ section.title }}</h3>
          <p>{{ section.subtitle }}</p>
          <div class="report-mini-tags">
            <span v-for="item in section.items" :key="item">{{ item }}</span>
          </div>
        </div>
        <LockKeyhole :size="17" class="lock-icon" />
      </article>
    </div>

    <button
      v-if="showAction"
      type="button"
      class="secondary-action accent premium-action"
      @click="emit('openConsultation')"
    >
      <Crown :size="18" />
      <span>进入深度解读</span>
      <ChevronRight :size="18" />
    </button>
  </section>
</template>
