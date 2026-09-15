<script setup lang="ts">
import { computed } from 'vue';
import { LogOut, ShieldCheck } from 'lucide-vue-next';
import type { AccessEntitlement } from '../domain/backendClient';

const props = defineProps<{ entitlement: AccessEntitlement }>();
const emit = defineEmits<{ logout: [] }>();

const isTerminal = computed(() => ['expired', 'exhausted', 'disabled'].includes(props.entitlement.status));
const statusLabel = computed(() => {
  if (props.entitlement.status === 'expired') return '访问已过期';
  if (props.entitlement.status === 'exhausted') return '次数已用完';
  if (props.entitlement.status === 'disabled') return '访问已停用';
  return '访问有效';
});
const terminalReason = computed(() => {
  if (props.entitlement.status === 'expired') return '有效期已结束，请联系支持获取新的兑换码。';
  if (props.entitlement.status === 'exhausted') return '本兑换码的使用次数已全部用完。';
  if (props.entitlement.status === 'disabled') return '该兑换码已被停用。';
  return '';
});
const formattedExpiry = computed(() => {
  if (!props.entitlement.expiresAt) return '未设置';
  const date = new Date(props.entitlement.expiresAt);
  if (Number.isNaN(date.getTime())) return props.entitlement.expiresAt;
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date);
});
</script>

<template>
  <aside class="entitlement-status" :class="{ terminal: isTerminal }" aria-label="访问权益">
    <div class="entitlement-status-main">
      <ShieldCheck :size="17" />
      <span class="entitlement-status-label">{{ statusLabel }}</span>
      <span class="entitlement-status-quota">剩余 {{ entitlement.remainingUses }} / {{ entitlement.maxUses }} 次</span>
      <span class="entitlement-status-expiry">至 {{ formattedExpiry }}</span>
    </div>
    <p v-if="isTerminal" class="entitlement-status-reason" role="status">{{ terminalReason }}</p>
    <button type="button" class="entitlement-logout" @click="emit('logout')">
      <LogOut :size="15" /> 退出登录
    </button>
  </aside>
</template>
