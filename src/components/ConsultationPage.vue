<script setup lang="ts">
import ConsultationHub from './ConsultationHub.vue';
import type { UserProfile } from '../domain/consultation';
import type { LotteryInput, LuckyLotteryResult } from '../domain/lottery';

defineProps<{
  result: LuckyLotteryResult | null;
  form: LotteryInput;
  userProfile: UserProfile;
  locked?: boolean;
  commercialMode?: boolean;
}>();

defineEmits<{
  'update:userProfile': [value: UserProfile];
  requestSetup: [options: { includeProfile: boolean; profileRequired: boolean }];
  reportGenerated: [];
}>();

</script>

<template>
  <main class="consultation-page">
    <section class="result-stack consultation-stack" aria-live="polite">
      <ConsultationHub
        :result="result"
        :form="form"
        :user-profile="userProfile"
        :locked="locked"
        :commercial-mode="commercialMode"
        @update:user-profile="$emit('update:userProfile', $event)"
        @request-setup="$emit('requestSetup', $event)"
        @report-generated="$emit('reportGenerated')"
      />
    </section>
  </main>
</template>
