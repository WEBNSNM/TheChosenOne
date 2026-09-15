<script setup lang="ts">
import {
  Bot,
  ChevronDown,
  LoaderCircle,
  MessageSquareText,
  Send,
  UploadCloud,
  User,
  XCircle,
} from 'lucide-vue-next';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { FileText } from 'lucide-vue-next';
import UserProfileFields from './UserProfileFields.vue';
import {
  buildConsultationMessages,
  buildGrowthReportInput,
  type ConsultationSceneId,
  getAvailableConsultationScenes,
  getMissingGrowthProfileFields,
  getChartMissingHint,
  isGrowthProfileComplete,
  isUserProfileFilled,
  isChartComplete,
  sceneRequiresUserProfile,
  type UserProfile,
} from '../domain/consultation';
import { BackendClientError, generateReport, submitAiChat } from '../domain/backendClient';
import type { DeepSeekMessage } from '../domain/deepseekClient';
import type { LotteryInput, LuckyLotteryResult } from '../domain/lottery';

const props = defineProps<{
  result: LuckyLotteryResult | null;
  form: LotteryInput;
  userProfile: UserProfile;
  locked?: boolean;
  commercialMode?: boolean;
}>();

const emit = defineEmits<{
  'update:userProfile': [value: UserProfile];
  requestSetup: [options: { includeProfile: boolean; profileRequired: boolean }];
  reportGenerated: [];
}>();

const availableScenes = computed(() => getAvailableConsultationScenes(Boolean(props.commercialMode)));
const selectedSceneId = ref<ConsultationSceneId>('premium-chart-report');
const userText = ref(getAvailableConsultationScenes(Boolean(props.commercialMode))[0].starter);
const screenshotText = ref('');
const answer = ref('');
const error = ref('');
const profileOpen = ref(Boolean(props.commercialMode));
const isLoading = ref(false);
const imagePreviewUrl = ref('');
const imageDataUrl = ref('');
const imageName = ref('');
let abortController: AbortController | undefined;
let pendingIdempotencyKey: string | undefined;
const answerTime = ref('');

function parseMarkdown(raw: string): string {
  const lines = raw.split('\n');
  const html: string[] = [];
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      if (inList) { html.push('</ul>'); inList = false; }
      continue;
    }

    // 标题 ### / ## / #
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      if (inList) { html.push('</ul>'); inList = false; }
      const level = headingMatch[1].length;
      const tag = `h${level}`;
      html.push(`<${tag}>${inlineMarkdown(headingMatch[2])}</${tag}>`);
      continue;
    }

    // 列表项 * 或 -
    const listMatch = trimmed.match(/^[*\-]\s+(.+)$/);
    if (listMatch) {
      if (!inList) { html.push('<ul>'); inList = true; }
      html.push(`<li>${inlineMarkdown(listMatch[1])}</li>`);
      continue;
    }

    // 普通段落
    if (inList) { html.push('</ul>'); inList = false; }
    html.push(`<p>${inlineMarkdown(trimmed)}</p>`);
  }

  if (inList) html.push('</ul>');
  return html.join('\n');
}

function inlineMarkdown(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

const renderedAnswer = computed(() => answer.value ? parseMarkdown(answer.value) : '');

const activeScene = computed(() => {
  return availableScenes.value.find((scene) => scene.id === selectedSceneId.value) ?? availableScenes.value[0];
});

const profileProxy = computed({
  get: () => props.userProfile,
  set: (value: UserProfile) => emit('update:userProfile', value),
});

onBeforeUnmount(() => {
  clearPreview();
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

async function submitConsultation(): Promise<void> {
  if (isLoading.value) return;
  if (props.locked) {
    error.value = '当前访问权益不可用，暂时无法生成解读。';
    return;
  }

  if (props.commercialMode) {
    if (!isGrowthProfileComplete(props.userProfile)) {
      const missing = getMissingGrowthProfileFields(props.userProfile);
      error.value = `请先补充${missing.join('、')}，再生成个人成长洞察报告。`;
      profileOpen.value = true;
      return;
    }

    isLoading.value = true;
    answer.value = '';
    error.value = '';
    try {
      answer.value = await generateReport({
        idempotencyKey: pendingIdempotencyKey ?? createChatIdempotencyKey(),
        ...buildGrowthReportInput({
          result: props.result,
          form: props.form,
          userProfile: {
            ...props.userProfile,
            customNote: userText.value.trim() === activeScene.value.starter ? props.userProfile.customNote : userText.value,
          },
        }),
      });
      pendingIdempotencyKey = undefined;
      emit('reportGenerated');
      answerTime.value = new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch (caught) {
      if (!isRetriableChatFailure(caught)) pendingIdempotencyKey = undefined;
      error.value = caught instanceof Error ? caught.message : '报告生成失败，请稍后重试。';
    } finally {
      isLoading.value = false;
    }
    return;
  }

  if (!isChartComplete(props.form) || !props.result) {
    error.value = getChartMissingHint(props.form) || '请先在灵感入口生成命盘数据。';
    emit('requestSetup', {
      includeProfile: sceneRequiresUserProfile(selectedSceneId.value) && !isUserProfileFilled(props.userProfile),
      profileRequired: sceneRequiresUserProfile(selectedSceneId.value) && !isUserProfileFilled(props.userProfile),
    });
    return;
  }

  if (sceneRequiresUserProfile(selectedSceneId.value) && !isUserProfileFilled(props.userProfile)) {
    error.value = '这个深度场景需要先补充个人背景。';
    emit('requestSetup', {
      includeProfile: true,
      profileRequired: true,
    });
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
      userProfile: { ...props.userProfile },
    });

    answer.value = await submitAiChat({
      idempotencyKey: pendingIdempotencyKey ?? createChatIdempotencyKey(),
      messages: withScreenshotImage(messages),
    });
    pendingIdempotencyKey = undefined;
    emit('reportGenerated');
    answerTime.value = new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch (caught) {
    if (caught instanceof DOMException && caught.name === 'AbortError') {
      pendingIdempotencyKey = undefined;
      error.value = '已停止本次请求。';
    } else {
      if (!isRetriableChatFailure(caught)) pendingIdempotencyKey = undefined;
      error.value = caught instanceof Error
        ? caught.message
        : 'DeepSeek 调用失败。浏览器直连可能受跨域策略影响，正式版本建议走后端中转。';
    }
  } finally {
    isLoading.value = false;
    abortController = undefined;
  }
}

function createChatIdempotencyKey(): string {
  const random = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  const idempotencyKey = `chat_${random}`;
  pendingIdempotencyKey = idempotencyKey;
  return idempotencyKey;
}

function isRetriableChatFailure(error: unknown): boolean {
  if (!(error instanceof BackendClientError)) return true;
  return error.status === 408 || error.status === 409 || error.status === 429 || error.status >= 500;
}

function stopConsultation(): void {
  abortController?.abort();
}

async function handleImageUpload(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) return;

  if (!file.type.startsWith('image/')) {
    error.value = '请上传图片文件。';
    input.value = '';
    return;
  }

  clearPreview();
  try {
    imageName.value = file.name;
    imagePreviewUrl.value = URL.createObjectURL(file);
    imageDataUrl.value = await readFileAsDataUrl(file);
  } catch {
    clearPreview();
    error.value = '图片读取失败，请重新上传。';
  } finally {
    input.value = '';
  }
}

function clearPreview(): void {
  if (imagePreviewUrl.value) {
    URL.revokeObjectURL(imagePreviewUrl.value);
  }

  imagePreviewUrl.value = '';
  imageDataUrl.value = '';
  imageName.value = '';
}

function withScreenshotImage(messages: DeepSeekMessage[]): DeepSeekMessage[] {
  if (selectedSceneId.value !== 'screenshot-reading' || !imageDataUrl.value) return messages;

  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== 'user' || typeof lastMessage.content !== 'string') return messages;

  return [
    ...messages.slice(0, -1),
    {
      ...lastMessage,
      content: [
        { type: 'text', text: lastMessage.content },
        { type: 'image_url', image_url: { url: imageDataUrl.value } },
      ],
    },
  ];
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('empty image data'));
      }
    });
    reader.addEventListener('error', () => reject(reader.error ?? new Error('image read failed')));
    reader.readAsDataURL(file);
  });
}

</script>

<template>
  <section class="consultation-hub">
    <div class="consultation-head">
      <div>
        <p class="eyebrow">AI CONSULTATION</p>
        <h2>{{ props.commercialMode ? '个人成长洞察' : '深度咨询场景' }}</h2>
      </div>
      <Bot :size="25" />
    </div>

    <p class="consultation-copy">
      {{ props.commercialMode
        ? '以你主动填写的职业、关注重点、目标和当前困难为主要依据，传统历法文化背景信息仅作可选文化参考。'
        : '选择一个主题，结合你的命盘与今日流日继续追问。当前为个人测试入口，正式使用建议通过安全服务连接模型。' }}
    </p>

    <button
      type="button"
      class="settings-toggle"
      :aria-expanded="profileOpen"
      @click="profileOpen = !profileOpen"
    >
      <User :size="17" />
      <span style="white-space: nowrap;">个人背景</span>
      <small>{{ props.commercialMode ? '职业、关注、目标与困难为必填' : (userProfile.nickname || '选填，提升精准度') }}</small>
      <ChevronDown :size="18" :class="{ rotated: profileOpen }" />
    </button>

    <UserProfileFields v-if="profileOpen" v-model="profileProxy" />

    <div class="consultation-layout">
      <nav class="scene-tabs" aria-label="咨询场景">
        <button
          v-for="scene in availableScenes"
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
            <span>{{ imageName || '上传命盘截图给模型解读' }}</span>
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
              placeholder="可选：补充截图里特别想看的文字，例如四柱、大运、流年、五行强弱等。"
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
          <button type="button" class="primary-action consult-submit" :disabled="isLoading || props.locked" @click="submitConsultation">
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
          <div class="answer-report-head">
            <FileText :size="18" />
            <div>
              <p class="eyebrow">AI INSIGHT REPORT</p>
              <span>{{ activeScene.title }}</span>
            </div>
            <small>{{ answerTime }}</small>
          </div>
          <div class="answer-report-body" v-html="renderedAnswer"></div>
        </div>

        <div v-else class="consultation-empty">
          {{ props.commercialMode
            ? '补充现实背景后，即可生成包含能力倾向、阶段观察与行动建议的报告。'
            : '选择场景、填入问题后，即可生成一份更像咨询服务的深度解读。' }}
        </div>
        <p v-if="props.commercialMode" class="inline-notice">
          本报告用于个人成长反思与行动规划；传统历法信息仅作文化参考，不构成确定性预测，也不替代医疗、法律或投资等专业建议。
        </p>
      </article>
    </div>
  </section>
</template>
