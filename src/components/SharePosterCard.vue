<script setup lang="ts">
import { Download, Eye, Image as ImageIcon, LoaderCircle, RefreshCw, X } from 'lucide-vue-next';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
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
const isModalOpen = ref(false);
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
  window.removeEventListener('keydown', handleKeydown);
});

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
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

async function openPosterModal(): Promise<void> {
  const url = previewUrl.value || await generatePoster();

  if (url) {
    isModalOpen.value = true;
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

function closePosterModal(): void {
  isModalOpen.value = false;
}

function clearPreview(): void {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = '';
  }

  isModalOpen.value = false;
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && isModalOpen.value) {
    closePosterModal();
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
      <button type="button" class="secondary-action accent" :disabled="isGenerating" @click="openPosterModal">
        <LoaderCircle v-if="isGenerating" :size="18" class="spin-icon" />
        <RefreshCw v-else-if="previewUrl" :size="18" />
        <Eye v-else :size="18" />
        <span>{{ previewUrl ? '打开海报' : '生成海报' }}</span>
      </button>
    </div>

    <p v-if="error" class="share-error">{{ error }}</p>
  </section>

  <Teleport to="body">
    <div
      v-if="previewUrl && isModalOpen"
      class="poster-modal"
      role="dialog"
      aria-modal="true"
      aria-label="今日分享图预览"
      @click.self="closePosterModal"
    >
      <div class="poster-modal-shell">
        <div class="poster-modal-head">
          <div>
            <p class="eyebrow">POSTER PREVIEW</p>
            <h2>今日分享 PNG</h2>
          </div>
          <div class="poster-modal-actions">
            <button type="button" class="secondary-action accent" @click="downloadPoster">
              <Download :size="18" />
              <span>下载 PNG</span>
            </button>
            <button type="button" class="icon-action modal-close" aria-label="关闭海报预览" @click="closePosterModal">
              <X :size="20" />
            </button>
          </div>
        </div>

        <div class="poster-modal-body">
          <img :src="previewUrl" alt="今日流日分享图预览" />
        </div>
      </div>
    </div>
  </Teleport>
</template>
