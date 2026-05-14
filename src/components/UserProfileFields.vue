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
      <input v-model="occupation" type="text" placeholder="例如：互联网产品经理" />
    </label>

    <label class="field">
      <span>补充说明</span>
      <textarea
        v-model="customNote"
        rows="2"
        placeholder="例如：最近关注事业、关系、健康、财务或学业，也可以写当前处境、目标和顾虑。"
      />
    </label>
  </div>
</template>
