<script setup lang="ts">
import { computed } from 'vue';
import type { UserProfile } from '../domain/consultation';

const props = defineProps<{
  modelValue: UserProfile;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: UserProfile];
}>();

function updateProfile(patch: Partial<UserProfile>): void {
  emit('update:modelValue', {
    ...props.modelValue,
    ...patch,
  });
}

const nickname = computed({
  get: () => props.modelValue.nickname,
  set: (value: string) => updateProfile({ nickname: value }),
});

const occupation = computed({
  get: () => props.modelValue.occupation,
  set: (value: string) => updateProfile({ occupation: value }),
});

const focus = computed({
  get: () => props.modelValue.focus,
  set: (value: string) => updateProfile({ focus: value }),
});

const goal = computed({
  get: () => props.modelValue.goal,
  set: (value: string) => updateProfile({ goal: value }),
});

const currentDifficulty = computed({
  get: () => props.modelValue.currentDifficulty,
  set: (value: string) => updateProfile({ currentDifficulty: value }),
});

const customNote = computed({
  get: () => props.modelValue.customNote,
  set: (value: string) => updateProfile({ customNote: value }),
});
</script>

<template>
  <div class="profile-panel" aria-label="个人背景">
    <label class="field">
      <span>称呼</span>
      <input v-model="nickname" type="text" placeholder="怎么称呼你" />
    </label>

    <label class="field">
      <span>职业 / 行业</span>
      <input v-model="occupation" type="text" required placeholder="例如：互联网产品经理" />
    </label>

    <label class="field">
      <span>当前关注重点</span>
      <input v-model="focus" type="text" required placeholder="例如：职业转型或团队协作" />
    </label>

    <label class="field">
      <span>希望达成的目标</span>
      <input v-model="goal" type="text" required placeholder="例如：未来 30 天明确下一步行动" />
    </label>

    <label class="field">
      <span>当前困难</span>
      <textarea v-model="currentDifficulty" rows="2" required placeholder="例如：信息很多，难以确定优先级。" />
    </label>

    <label class="field">
      <span>补充说明（选填）</span>
      <textarea
        v-model="customNote"
        rows="2"
        placeholder="只填写生成报告确有帮助的信息，避免提供身份证号、联系方式等敏感资料。"
      />
    </label>
  </div>
</template>
