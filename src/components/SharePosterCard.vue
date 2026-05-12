<script setup lang="ts">
import { Download, Eye, Image as ImageIcon, LoaderCircle, RefreshCw } from 'lucide-vue-next';
import { onBeforeUnmount, ref, watch } from 'vue';
import {
  SHARE_POSTER_TEMPLATES,
  createSharePosterPng,
  getSharePosterFileName,
  type SharePosterTemplateId,
} from '../domain/sharePoster';
import type { LuckyLotteryResult } from '../domain/lottery';

const props = defineProps<{
  result: LuckyLotteryResult;
  targetDate: string;
}>();

const previewUrl = ref('');
const isGenerating = ref(false);
const error = ref('');
const selectedTemplate = ref<SharePosterTemplateId>('mystic');

watch(
  () => [props.result, props.targetDate],
  () => {
    clearPreview();
    error.value = '';
  },
);

watch(selectedTemplate, () => {
  if (previewUrl.value) {
    void generatePoster();
  }
});

onBeforeUnmount(() => {
  clearPreview();
});

async function generatePoster(): Promise<string | undefined> {
  isGenerating.value = true;
  error.value = '';

  try {
    const blob = await createSharePosterPng(props.result, props.targetDate, selectedTemplate.value);
    clearPreview();
    previewUrl.value = URL.createObjectURL(blob);

    return previewUrl.value;
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : '分享图生成失败，请稍后重试';

    return undefined;
  } finally {
    isGenerating.value = false;
  }
}

async function downloadPoster(): Promise<void> {
  const url = previewUrl.value || await generatePoster();

  if (!url) return;

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = getSharePosterFileName(props.targetDate, selectedTemplate.value);
  anchor.click();
}

function clearPreview(): void {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = '';
  }
}
</script>

<template>
  <section class="share-card">
    <div class="share-head">
      <div>
        <p class="eyebrow">DAILY SHARE</p>
        <h2>今日分享 PNG</h2>
      </div>
      <ImageIcon :size="24" />
    </div>

    <p class="share-copy">
      选择一种版面，先预览再下载，把今日吉凶、适合事项、命盘五行和红蓝灵感生成一张分享图。
    </p>

    <div class="poster-template-grid" role="group" aria-label="分享图版面">
      <button
        v-for="template in SHARE_POSTER_TEMPLATES"
        :key="template.id"
        type="button"
        :class="{ active: selectedTemplate === template.id }"
        @click="selectedTemplate = template.id"
      >
        <strong>{{ template.name }}</strong>
        <span>{{ template.description }}</span>
      </button>
    </div>

    <div class="share-actions">
      <button type="button" class="secondary-action" :disabled="isGenerating" @click="generatePoster">
        <LoaderCircle v-if="isGenerating" :size="18" class="spin-icon" />
        <RefreshCw v-else-if="previewUrl" :size="18" />
        <Eye v-else :size="18" />
        <span>{{ previewUrl ? '重新预览' : '预览 PNG' }}</span>
      </button>
      <button type="button" class="secondary-action accent" :disabled="isGenerating" @click="downloadPoster">
        <Download :size="18" />
        <span>下载</span>
      </button>
    </div>

    <p v-if="error" class="share-error">{{ error }}</p>

    <div v-if="previewUrl" class="poster-preview" aria-label="今日分享图预览">
      <img :src="previewUrl" alt="今日流日分享图预览" />
    </div>
  </section>
</template>
