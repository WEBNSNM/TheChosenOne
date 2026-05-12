<script setup lang="ts">
import {
  Bot,
  CheckCircle2,
  ChevronDown,
  KeyRound,
  LoaderCircle,
  MessageSquareText,
  Save,
  Send,
  Settings2,
  ShieldCheck,
  Trash2,
  UploadCloud,
  XCircle,
} from 'lucide-vue-next';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import {
  buildConsultationMessages,
  consultationScenes,
  type ConsultationSceneId,
} from '../domain/consultation';
import { askDeepSeek, DEEPSEEK_MODELS, type DeepSeekModel } from '../domain/deepseekClient';
import {
  clearDeepSeekSettings,
  loadDeepSeekSettings,
  saveDeepSeekSettings,
} from '../domain/deepseekSettings';
import type { LotteryInput, LuckyLotteryResult } from '../domain/lottery';

const props = defineProps<{
  result: LuckyLotteryResult;
  form: LotteryInput;
}>();

const savedSettings = loadDeepSeekSettings();
const selectedSceneId = ref<ConsultationSceneId>(consultationScenes[0].id);
const apiKey = ref(savedSettings.apiKey);
const model = ref<DeepSeekModel>(savedSettings.model);
const userText = ref(consultationScenes[0].starter);
const screenshotText = ref('');
const answer = ref('');
const error = ref('');
const notice = ref('');
const settingsOpen = ref(false);
const isLoading = ref(false);
const imagePreviewUrl = ref('');
const imageName = ref('');
let abortController: AbortController | undefined;
let noticeTimer: ReturnType<typeof setTimeout> | undefined;

const activeScene = computed(() => {
  return consultationScenes.find((scene) => scene.id === selectedSceneId.value) ?? consultationScenes[0];
});

const activeModel = computed(() => {
  return DEEPSEEK_MODELS.find((item) => item.value === model.value) ?? DEEPSEEK_MODELS[0];
});

onBeforeUnmount(() => {
  clearPreview();
  clearNoticeTimer();
  abortController?.abort();
});

watch(
  () => [
    props.result,
    props.form.birthDate,
    props.form.birthTime,
    props.form.birthCalendar,
    props.form.gender,
    props.form.birthPlace,
    props.form.useTrueSolarTime,
    props.form.birthTimeAccuracy,
    props.form.targetDate,
  ],
  () => {
    answer.value = '';
    error.value = '';
  },
);

function selectScene(sceneId: ConsultationSceneId): void {
  selectedSceneId.value = sceneId;
  userText.value = activeScene.value.starter;
  answer.value = '';
  error.value = '';

  if (!activeScene.value.acceptsScreenshot) {
    screenshotText.value = '';
    clearPreview();
  }
}

function saveSettings(): void {
  saveDeepSeekSettings({ apiKey: apiKey.value, model: model.value });
  showNotice('已保存到本机浏览器');
}

function clearSettings(): void {
  clearDeepSeekSettings();
  apiKey.value = '';
  model.value = 'deepseek-v4-flash';
  showNotice('已清除本机 Key');
}

async function submitConsultation(): Promise<void> {
  if (isLoading.value) return;

  if (!apiKey.value.trim()) {
    error.value = '请先填写 DeepSeek API Key。';
    return;
  }

  isLoading.value = true;
  answer.value = '';
  error.value = '';
  abortController = new AbortController();

  try {
    const messages = buildConsultationMessages({
      sceneId: selectedSceneId.value,
      result: props.result,
      form: props.form,
      userText: userText.value,
      screenshotText: screenshotText.value,
    });

    answer.value = await askDeepSeek({
      apiKey: apiKey.value,
      messages,
      model: model.value,
      signal: abortController.signal,
    });
    saveDeepSeekSettings({ apiKey: apiKey.value, model: model.value });
  } catch (caught) {
    if (caught instanceof DOMException && caught.name === 'AbortError') {
      error.value = '已停止本次请求。';
    } else {
      error.value = caught instanceof Error
        ? caught.message
        : 'DeepSeek 调用失败。浏览器直连可能受跨域策略影响，正式版本建议走后端中转。';
    }
  } finally {
    isLoading.value = false;
    abortController = undefined;
  }
}

function stopConsultation(): void {
  abortController?.abort();
}

function handleImageUpload(event: Event): void {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) return;

  if (!file.type.startsWith('image/')) {
    error.value = '请上传图片文件。';
    input.value = '';
    return;
  }

  clearPreview();
  imageName.value = file.name;
  imagePreviewUrl.value = URL.createObjectURL(file);
  input.value = '';
}

function clearPreview(): void {
  if (imagePreviewUrl.value) {
    URL.revokeObjectURL(imagePreviewUrl.value);
  }

  imagePreviewUrl.value = '';
  imageName.value = '';
}

function showNotice(message: string): void {
  notice.value = message;
  clearNoticeTimer();
  noticeTimer = setTimeout(() => {
    notice.value = '';
  }, 2200);
}

function clearNoticeTimer(): void {
  if (noticeTimer) {
    clearTimeout(noticeTimer);
    noticeTimer = undefined;
  }
}
</script>

<template>
  <section class="consultation-hub">
    <div class="consultation-head">
      <div>
        <p class="eyebrow">AI CONSULTATION</p>
        <h2>深度咨询场景</h2>
      </div>
      <Bot :size="25" />
    </div>

    <p class="consultation-copy">
      选择一个主题，结合你的命盘与今日流日继续追问。当前为个人测试入口，正式使用建议通过安全服务连接模型。
    </p>

    <button
      type="button"
      class="settings-toggle"
      :aria-expanded="settingsOpen"
      @click="settingsOpen = !settingsOpen"
    >
      <Settings2 :size="17" />
      <span>模型设置</span>
      <small>{{ activeModel.label }}</small>
      <ChevronDown :size="18" :class="{ rotated: settingsOpen }" />
    </button>

    <div v-if="settingsOpen" class="consultation-settings" aria-label="DeepSeek 设置">
      <label class="field key-field">
        <span>
          <KeyRound :size="16" />
          DeepSeek API Key
        </span>
        <input v-model="apiKey" type="password" autocomplete="off" placeholder="sk-..." />
      </label>

      <label class="field model-field">
        <span>模型</span>
        <select v-model="model">
          <option v-for="item in DEEPSEEK_MODELS" :key="item.value" :value="item.value">
            {{ item.label }}
          </option>
        </select>
      </label>

      <div class="settings-actions">
        <button type="button" class="secondary-action accent" @click="saveSettings">
          <Save :size="17" />
          <span>保存</span>
        </button>
        <button type="button" class="secondary-action" @click="clearSettings">
          <Trash2 :size="17" />
          <span>清除</span>
        </button>
      </div>
    </div>

    <p v-if="settingsOpen" class="model-note">
      <ShieldCheck :size="16" />
      <span>{{ activeModel.description }} Key 仅保存在本机浏览器，请勿在公开环境长期使用。</span>
    </p>
    <p v-if="notice" class="inline-notice">
      <CheckCircle2 :size="16" />
      <span>{{ notice }}</span>
    </p>

    <div class="consultation-layout">
      <nav class="scene-tabs" aria-label="咨询场景">
        <button
          v-for="scene in consultationScenes"
          :key="scene.id"
          type="button"
          :class="{ active: scene.id === selectedSceneId }"
          @click="selectScene(scene.id)"
        >
          <strong>{{ scene.shortTitle }}</strong>
          <span>{{ scene.badge }}</span>
        </button>
      </nav>

      <article class="scene-page">
        <div class="scene-title-row">
          <div>
            <p class="eyebrow">SCENE PAGE</p>
            <h3>{{ activeScene.title }}</h3>
          </div>
          <span class="scene-badge">{{ activeScene.badge }}</span>
        </div>

        <p class="scene-subtitle">{{ activeScene.subtitle }}</p>

        <div class="deliverable-row" aria-label="交付内容">
          <span v-for="item in activeScene.deliverables" :key="item">{{ item }}</span>
        </div>

        <div v-if="activeScene.acceptsScreenshot" class="screenshot-tool">
          <label class="upload-drop">
            <UploadCloud :size="21" />
            <span>{{ imageName || '上传截图本地预览' }}</span>
            <input type="file" accept="image/*" @change="handleImageUpload" />
          </label>

          <div v-if="imagePreviewUrl" class="screenshot-preview">
            <img :src="imagePreviewUrl" alt="命盘截图本地预览" />
            <button type="button" class="icon-action" aria-label="移除截图预览" @click="clearPreview">
              <XCircle :size="18" />
            </button>
          </div>

          <label class="field consultation-field">
            <span>截图中的关键文字</span>
            <textarea
              v-model="screenshotText"
              rows="4"
              placeholder="粘贴四柱、大运、流年、五行强弱等文字。图片当前仅本地预览，发送给模型的是这里的文字。"
            />
          </label>
        </div>

        <label class="field consultation-field">
          <span>
            <MessageSquareText :size="16" />
            {{ activeScene.inputLabel }}
          </span>
          <textarea v-model="userText" rows="4" :placeholder="activeScene.placeholder" />
        </label>

        <div class="consultation-actions">
          <button type="button" class="primary-action consult-submit" :disabled="isLoading" @click="submitConsultation">
            <LoaderCircle v-if="isLoading" :size="18" class="spin-icon" />
            <Send v-else :size="18" />
            <span>{{ isLoading ? '解读中' : '开始解读' }}</span>
          </button>
          <button v-if="isLoading" type="button" class="secondary-action" @click="stopConsultation">
            <XCircle :size="18" />
            <span>停止</span>
          </button>
        </div>

        <p v-if="error" class="share-error">{{ error }}</p>

        <div v-if="answer" class="consultation-answer">
          <p class="eyebrow">AI RESPONSE</p>
          <div>{{ answer }}</div>
        </div>

        <div v-else class="consultation-empty">
          选择场景、填入问题后，即可生成一份更像咨询服务的深度解读。
        </div>
      </article>
    </div>
  </section>
</template>
