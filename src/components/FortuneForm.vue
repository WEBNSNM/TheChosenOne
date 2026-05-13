<script setup lang="ts">
import { computed } from 'vue';
import {
  BadgeDollarSign,
  Clock3,
  Flame,
  LocateFixed,
  MapPin,
  Moon,
  Scale,
  Sun,
  UserRound,
  WandSparkles,
} from 'lucide-vue-next';
import type { BirthGender, BirthTimeAccuracy, CalendarMode } from '../domain/bazi';
import type { LotteryInput, LotteryStrategy } from '../domain/lottery';

const props = defineProps<{
  modelValue: LotteryInput;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: LotteryInput];
  submit: [];
}>();

const strategies = [
  {
    value: 'balance',
    label: '调和',
    title: '五行调和',
    icon: Scale,
  },
  {
    value: 'wealth',
    label: '财星',
    title: '财星优先',
    icon: BadgeDollarSign,
  },
  {
    value: 'bold',
    label: '冲劲',
    title: '流日冲劲',
    icon: Flame,
  },
] as const;

const calendarModes = [
  {
    value: 'solar',
    label: '阳历',
    title: '按公历生日输入',
    icon: Sun,
  },
  {
    value: 'lunar',
    label: '农历',
    title: '按农历生日输入，自动转公历后排盘',
    icon: Moon,
  },
] as const;

const genderOptions = [
  {
    value: 'male',
    label: '男',
    title: '用于大运顺逆与报告语境',
  },
  {
    value: 'female',
    label: '女',
    title: '用于大运顺逆与报告语境',
  },
  {
    value: 'unspecified',
    label: '不透露',
    title: '继续使用中性解读',
  },
] as const;

const timeAccuracyOptions = [
  {
    value: 'exact',
    label: '准确',
    title: '出生时间比较确定',
  },
  {
    value: 'approximate',
    label: '大概',
    title: '出生时间可能有少量误差',
  },
  {
    value: 'unknown',
    label: '不确定',
    title: '不确定具体时辰，报告会降低时柱断语强度',
  },
] as const;

const luckyDigits = Array.from({ length: 10 }, (_, index) => index);
const canUseTrueSolarTime = computed(() => Boolean(props.modelValue.birthPlace?.trim()));

function updateField(field: keyof LotteryInput, event: Event): void {
  emit('update:modelValue', {
    ...props.modelValue,
    [field]: (event.target as HTMLInputElement).value,
  });
}

function setStrategy(strategy: LotteryStrategy): void {
  emit('update:modelValue', {
    ...props.modelValue,
    strategy,
  });
}

function setGender(gender: BirthGender): void {
  emit('update:modelValue', {
    ...props.modelValue,
    gender,
  });
}

function setBirthTimeAccuracy(birthTimeAccuracy: BirthTimeAccuracy): void {
  emit('update:modelValue', {
    ...props.modelValue,
    birthTimeAccuracy,
  });
}

function setBirthCalendar(calendar: CalendarMode): void {
  emit('update:modelValue', {
    ...props.modelValue,
    birthCalendar: calendar,
    birthLeapMonth: calendar === 'lunar' ? props.modelValue.birthLeapMonth : false,
  });
}

function updateLeapMonth(event: Event): void {
  emit('update:modelValue', {
    ...props.modelValue,
    birthLeapMonth: (event.target as HTMLInputElement).checked,
  });
}

function updateBirthPlace(event: Event): void {
  const birthPlace = (event.target as HTMLInputElement).value;

  emit('update:modelValue', {
    ...props.modelValue,
    birthPlace,
    useTrueSolarTime: birthPlace.trim() ? props.modelValue.useTrueSolarTime : false,
  });
}

function updateTrueSolarTime(event: Event): void {
  emit('update:modelValue', {
    ...props.modelValue,
    useTrueSolarTime: canUseTrueSolarTime.value && (event.target as HTMLInputElement).checked,
  });
}

function toggleLuckyNumber(value: number): void {
  const selected = new Set(props.modelValue.luckyNumbers ?? []);

  if (selected.has(value)) {
    selected.delete(value);
  } else {
    selected.add(value);
  }

  emit('update:modelValue', {
    ...props.modelValue,
    luckyNumbers: Array.from(selected).sort((first, second) => first - second),
  });
}
</script>

<template>
  <form class="fortune-form" @submit.prevent="emit('submit')">
    <div class="form-head">
      <div>
        <p class="eyebrow">PERSONAL CHART</p>
        <h2>输入命盘</h2>
      </div>
      <WandSparkles :size="24" />
    </div>

    <label class="field">
      <span>姓名 / 称呼</span>
      <input
        :value="modelValue.customerName"
        type="text"
        placeholder="例如：林一"
        autocomplete="name"
        @input="updateField('customerName', $event)"
      />
    </label>

    <label class="field">
      <span>出生日期</span>
      <input
        :value="modelValue.birthDate"
        type="date"
        required
        @input="updateField('birthDate', $event)"
      />
    </label>

    <div class="calendar-picker" role="group" aria-label="出生日期历法">
      <button
        v-for="option in calendarModes"
        :key="option.value"
        :class="{ active: (modelValue.birthCalendar ?? 'solar') === option.value }"
        :title="option.title"
        type="button"
        @click="setBirthCalendar(option.value)"
      >
        <component :is="option.icon" :size="16" />
        <span>{{ option.label }}</span>
      </button>
      <label v-if="modelValue.birthCalendar === 'lunar'" class="leap-toggle">
        <input
          :checked="Boolean(modelValue.birthLeapMonth)"
          type="checkbox"
          @change="updateLeapMonth"
        />
        <span>闰月</span>
      </label>
    </div>

    <label class="field">
      <span>出生时间</span>
      <input
        :value="modelValue.birthTime"
        type="time"
        required
        @input="updateField('birthTime', $event)"
      />
    </label>

    <div class="profile-section">
      <div class="field-caption">
        <span>
          <UserRound :size="16" />
          性别
        </span>
        <small>影响大运与报告语境</small>
      </div>
      <div class="option-grid gender-grid" role="group" aria-label="性别">
        <button
          v-for="option in genderOptions"
          :key="option.value"
          :class="{ active: (modelValue.gender ?? 'unspecified') === option.value }"
          :title="option.title"
          type="button"
          @click="setGender(option.value)"
        >
          <UserRound :size="16" />
          <span>{{ option.label }}</span>
        </button>
      </div>
    </div>

    <div class="profile-section">
      <div class="field-caption">
        <span>
          <Clock3 :size="16" />
          出生时间准确度
        </span>
        <small>控制解读确定性</small>
      </div>
      <div class="option-grid accuracy-grid" role="group" aria-label="出生时间准确度">
        <button
          v-for="option in timeAccuracyOptions"
          :key="option.value"
          :class="{ active: (modelValue.birthTimeAccuracy ?? 'approximate') === option.value }"
          :title="option.title"
          type="button"
          @click="setBirthTimeAccuracy(option.value)"
        >
          <Clock3 :size="16" />
          <span>{{ option.label }}</span>
        </button>
      </div>
    </div>

    <div class="profile-section calibration-fields">
      <label class="field">
        <span>
          <MapPin :size="16" />
          出生地
        </span>
        <input
          :value="modelValue.birthPlace"
          type="text"
          placeholder="例如：杭州"
          autocomplete="address-level2"
          @input="updateBirthPlace"
        />
      </label>

      <label class="switch-row" :class="{ disabled: !canUseTrueSolarTime }">
        <input
          :checked="Boolean(modelValue.useTrueSolarTime) && canUseTrueSolarTime"
          :disabled="!canUseTrueSolarTime"
          type="checkbox"
          @change="updateTrueSolarTime"
        />
        <span>
          <LocateFixed :size="16" />
          使用真太阳时校准
        </span>
      </label>
      <p class="field-hint">出生地可用于真太阳时校准，时辰交界附近更建议填写。</p>
    </div>

    <label class="field">
      <span>流日日期</span>
      <input
        :value="modelValue.targetDate"
        type="date"
        required
        @input="updateField('targetDate', $event)"
      />
    </label>

    <div class="strategy-group" role="group" aria-label="灵感策略">
      <button
        v-for="option in strategies"
        :key="option.value"
        :class="{ active: modelValue.strategy === option.value }"
        :title="option.title"
        type="button"
        @click="setStrategy(option.value)"
      >
        <component :is="option.icon" :size="16" />
        <span>{{ option.label }}</span>
      </button>
    </div>

    <div class="lucky-number-panel">
      <div class="field-caption">
        <span>幸运数字</span>
        <small>可不选</small>
      </div>
      <div class="lucky-number-grid" role="group" aria-label="幸运数字">
        <button
          v-for="digit in luckyDigits"
          :key="digit"
          :class="{ active: modelValue.luckyNumbers?.includes(digit) }"
          :title="`优先匹配数字 ${digit}`"
          type="button"
          @click="toggleLuckyNumber(digit)"
        >
          {{ digit }}
        </button>
      </div>
    </div>

    <button class="primary-action" type="submit">
      <WandSparkles :size="18" />
      <span>生成灵感</span>
    </button>
  </form>
</template>
