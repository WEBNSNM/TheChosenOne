<script setup lang="ts">
import {
  Bot,
  ChevronDown,
  LoaderCircle,
  MessageSquareText,
  Send,
  Settings2,
  ShieldCheck,
  UploadCloud,
  User,
  XCircle,
} from 'lucide-vue-next';
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import {
  buildConsultationMessages,
  consultationScenes,
  type ConsultationSceneId,
  CURRENT_FOCUS_OPTIONS,
  getChartMissingHint,
  isChartComplete,
} from '../domain/consultation';
import { submitAiChat } from '../domain/backendClient';
import {
  loadUserProfile,
  saveUserProfile,
} from '../domain/deepseekSettings';
import type { LotteryInput, LuckyLotteryResult } from '../domain/lottery';

const props = defineProps<{
  result: LuckyLotteryResult | null;
  form: LotteryInput;
}>();

const selectedSceneId = ref<ConsultationSceneId>(consultationScenes[0].id);
const userText = ref(consultationScenes[0].starter);
const screenshotText = ref('');
const answer = ref('');
const error = ref('');
const settingsOpen = ref(false);
const profileOpen = ref(false);
const isLoading = ref(false);
const imagePreviewUrl = ref('');
const imageName = ref('');
const userProfile = reactive(loadUserProfile());
let abortController: AbortController | undefined;
let profileSaveTimer: ReturnType<typeof setTimeout> | undefined;

const activeScene = computed(() => {
  return consultationScenes.find((scene) => scene.id === selectedSceneId.value) ?? consultationScenes[0];
});

onBeforeUnmount(() => {
  clearPreview();
  if (profileSaveTimer) clearTimeout(profileSaveTimer);
  abortController?.abort();
});

watch(userProfile, () => {
  if (profileSaveTimer) clearTimeout(profileSaveTimer);
  profileSaveTimer = setTimeout(() => saveUserProfile({ ...userProfile }), 600);
}, { deep: true });

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

async function submitConsultation(): Promise<void> {
  if (isLoading.value) return;

  if (!isChartComplete(props.form) || !props.result) {
    error.value = getChartMissingHint(props.form) || '请先在灵感入口生成命盘数据。';
    return;
  }

  isLoading.value = true;
  answer.value = '';
  error.value = '';
  abortController = new AbortController();

  try {
    const messages = buildConsultationMessages({
      sceneId: selectedSceneId.value,
      result: props.result!,
      form: props.form,
      userText: userText.value,
      screenshotText: screenshotText.value,
      userProfile: { ...userProfile },
    });

    answer.value = await submitAiChat({
      messages,
    });
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
      <span>模型服务</span>
      <small>由后台统一配置</small>
      <ChevronDown :size="18" :class="{ rotated: settingsOpen }" />
    </button>

    <p v-if="settingsOpen" class="model-note">
      <ShieldCheck :size="16" />
      <span>模型、接口地址和 API Key 已迁移到后台配置，浏览器不会再保存真实密钥。</span>
    </p>

    <button
      type="button"
      class="settings-toggle"
      :aria-expanded="profileOpen"
      @click="profileOpen = !profileOpen"
    >
      <User :size="17" />
      <span>个人背景</span>
      <small>{{ userProfile.nickname || '选填，提升精准度' }}</small>
      <ChevronDown :size="18" :class="{ rotated: profileOpen }" />
    </button>

    <div v-if="profileOpen" class="profile-panel" aria-label="个人背景">
      <label class="field">
        <span>称呼</span>
        <input v-model="userProfile.nickname" type="text" placeholder="怎么称呼你" />
      </label>

      <label class="field">
        <span>职业 / 行业</span>
        <input v-model="userProfile.occupation" type="text" placeholder="例如：互联网产品经理" />
      </label>

      <label class="field">
        <span>当前最关注</span>
        <select v-model="userProfile.currentFocus">
          <option v-for="opt in CURRENT_FOCUS_OPTIONS" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </label>

      <label class="field">
        <span>补充说明</span>
        <textarea v-model="userProfile.customNote" rows="2" placeholder="其他想让AI知道的背景信息" />
      </label>
    </div>

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
