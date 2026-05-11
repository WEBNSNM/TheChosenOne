<script setup lang="ts">
import { BadgeDollarSign, Flame, Moon, Scale, Sun, WandSparkles } from 'lucide-vue-next';
import type { CalendarMode } from '../domain/bazi';
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

const luckyDigits = Array.from({ length: 10 }, (_, index) => index);

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

    <label class="field">
      <span>选号日期</span>
      <input
        :value="modelValue.targetDate"
        type="date"
        required
        @input="updateField('targetDate', $event)"
      />
    </label>

    <div class="strategy-group" role="group" aria-label="选号策略">
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
      <span>生成号码</span>
    </button>
  </form>
</template>
