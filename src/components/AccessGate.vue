<script setup lang="ts">
import { ref } from 'vue';
import { ArrowRight, CircleAlert, LifeBuoy, LockKeyhole } from 'lucide-vue-next';
import { redeemAccessCode, type AccessEntitlement } from '../domain/backendClient';

const props = withDefaults(defineProps<{ statusMessage?: string; maxUses?: number; validDays?: number }>(), {
  maxUses: 10,
  validDays: 7,
});

const emit = defineEmits<{ redeemed: [access: AccessEntitlement] }>();

const code = ref('');
const isRedeeming = ref(false);
const error = ref('');

async function submitRedeem(): Promise<void> {
  const value = code.value.trim();
  if (!value || isRedeeming.value) return;

  isRedeeming.value = true;
  error.value = '';
  try {
    const access = await redeemAccessCode(value);
    code.value = '';
    emit('redeemed', access);
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : '';
    if (/绑定|bound/i.test(message)) error.value = '兑换码已绑定，请使用新的兑换码。';
    else if (/过期|expired/i.test(message)) error.value = '兑换码已过期，请联系支持。';
    else if (/不可用|unavailable/i.test(message)) error.value = '兑换码已过期或已停用，请联系支持。';
    else if (/无效|invalid|not found/i.test(message)) error.value = '兑换码无效，请检查后重试。';
    else error.value = message || '兑换失败，请稍后重试。';
  } finally {
    isRedeeming.value = false;
  }
}
</script>

<template>
  <main class="access-gate" aria-labelledby="access-gate-title">
    <section class="access-gate-card">
      <div class="access-gate-brand"><LockKeyhole :size="18" /> 个人成长洞察工具</div>
      <p class="access-gate-kicker">PERSONAL GROWTH OBSERVATORY</p>
      <h1 id="access-gate-title">理清当下，再决定下一步</h1>
      <p class="access-gate-lead">能力倾向 · 阶段观察 · 事业与金钱行动建议</p>
      <p class="access-gate-entitlement">兑换即用 · {{ props.validDays }} 天 {{ props.maxUses }} 次</p>
      <p v-if="statusMessage" class="access-gate-support" role="status">{{ statusMessage }}</p>

      <form class="access-gate-form" @submit.prevent="submitRedeem">
        <label for="access-code">兑换码</label>
        <div class="access-gate-input-row">
          <input
            id="access-code"
            v-model="code"
            type="password"
            autocomplete="one-time-code"
            placeholder="输入兑换码"
            aria-describedby="access-code-help access-code-error"
            :aria-invalid="Boolean(error)"
          />
          <button type="submit" :disabled="isRedeeming || !code.trim()">
            {{ isRedeeming ? '兑换中…' : '立即兑换' }}
            <ArrowRight :size="17" />
          </button>
        </div>
        <p id="access-code-help" class="access-gate-support">兑换码会绑定首个浏览器，不保存原始兑换码。需要帮助？请联系支持。</p>
        <p v-if="error" id="access-code-error" class="access-gate-error" role="alert" aria-live="polite">
          <CircleAlert :size="16" /> {{ error }}
        </p>
      </form>

      <p class="access-gate-notice">内容由 AI 基于用户主动提供的信息生成，并参考传统历法文化视角，用于自我观察与行动整理；不代表对未来事件或收益的预测，不构成投资、医疗、法律等专业建议。</p>
      <p class="access-gate-help"><LifeBuoy :size="16" /> 支持：兑换遇到问题时，请提供订单信息联系我们。</p>
    </section>
  </main>
</template>
