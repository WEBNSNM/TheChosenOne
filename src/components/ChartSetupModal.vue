<script setup lang="ts">
import { computed } from 'vue';
import { UserRoundCheck, X } from 'lucide-vue-next';
import FortuneForm from './FortuneForm.vue';
import UserProfileFields from './UserProfileFields.vue';
import type { UserProfile } from '../domain/consultation';
import type { LotteryInput } from '../domain/lottery';

const props = defineProps<{
  modelValue: LotteryInput;
  userProfile: UserProfile;
  profileRequired?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: LotteryInput];
  'update:userProfile': [value: UserProfile];
  close: [];
  submit: [];
}>();

const formProxy = computed({
  get: () => props.modelValue,
  set: (value: LotteryInput) => emit('update:modelValue', value),
});

const profileProxy = computed({
  get: () => props.userProfile,
  set: (value: UserProfile) => emit('update:userProfile', value),
});
</script>

<template>
  <Teleport to="body">
    <div class="chart-modal" role="dialog" aria-modal="true" aria-label="输入命盘" @click.self="emit('close')">
      <div class="chart-modal-shell">
        <div class="chart-modal-head">
          <div>
            <p class="eyebrow">PERSONAL CHART</p>
            <h2>输入命盘</h2>
          </div>
          <button type="button" class="chart-modal-close" aria-label="关闭输入命盘" @click="emit('close')">
            <X :size="18" />
          </button>
        </div>

        <div class="chart-modal-body">
          <p v-if="profileRequired" class="inline-notice profile-required-note">
            <UserRoundCheck :size="16" />
            <span>这个深度场景需要先补充个人背景，命盘和背景会一起用于生成解读。</span>
          </p>

          <FortuneForm v-model="formProxy" @submit="emit('submit')">
            <template #before-submit>
              <UserProfileFields v-model="profileProxy" class="chart-profile-panel" />
            </template>
          </FortuneForm>
        </div>
      </div>
    </div>
  </Teleport>
</template>
