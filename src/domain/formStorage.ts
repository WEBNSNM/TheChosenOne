import type { BirthGender, BirthTimeAccuracy, CalendarMode } from './bazi';
import type { LotteryInput, LotteryStrategy } from './lottery';
import { normalizeLuckyNumbers } from './lottery';

export const FORM_STORAGE_KEY = 'the-chosen-one:fortune-form';

type PersistedForm = Partial<Record<keyof LotteryInput, unknown>>;

const calendarModes = new Set<CalendarMode>(['solar', 'lunar']);
const birthGenders = new Set<BirthGender>(['male', 'female', 'unspecified']);
const birthTimeAccuracies = new Set<BirthTimeAccuracy>(['exact', 'approximate', 'unknown']);
const strategies = new Set<LotteryStrategy>(['balance', 'wealth', 'bold']);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^\d{2}:\d{2}$/;

export function getBrowserStorage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

export function loadSavedForm(defaults: LotteryInput, storage = getBrowserStorage()): LotteryInput {
  if (!storage) return defaults;

  try {
    const raw = storage.getItem(FORM_STORAGE_KEY);
    if (!raw) return defaults;

    const parsed = JSON.parse(raw) as PersistedForm;
    return normalizeForm(defaults, parsed);
  } catch {
    return defaults;
  }
}

export function saveForm(form: LotteryInput, storage = getBrowserStorage()): void {
  if (!storage) return;

  try {
    storage.setItem(FORM_STORAGE_KEY, JSON.stringify(toPersistedForm(form)));
  } catch {
    // localStorage can be unavailable in private mode or blocked desktop shells.
  }
}

function normalizeForm(defaults: LotteryInput, saved: PersistedForm): LotteryInput {
  const birthCalendar = isCalendarMode(saved.birthCalendar) ? saved.birthCalendar : defaults.birthCalendar;

  const form: LotteryInput = {
    birthDate: isDateString(saved.birthDate) ? saved.birthDate : defaults.birthDate,
    birthTime: isTimeString(saved.birthTime) ? saved.birthTime : defaults.birthTime,
    birthCalendar,
    birthLeapMonth: birthCalendar === 'lunar' && typeof saved.birthLeapMonth === 'boolean'
      ? saved.birthLeapMonth
      : false,
    gender: isBirthGender(saved.gender) ? saved.gender : defaults.gender,
    birthPlace: normalizeBirthPlace(saved.birthPlace, defaults.birthPlace),
    useTrueSolarTime: typeof saved.useTrueSolarTime === 'boolean'
      ? saved.useTrueSolarTime
      : defaults.useTrueSolarTime,
    birthTimeAccuracy: isBirthTimeAccuracy(saved.birthTimeAccuracy)
      ? saved.birthTimeAccuracy
      : defaults.birthTimeAccuracy,
    targetDate: defaults.targetDate,
    luckyNumbers: normalizeLuckyNumbers(Array.isArray(saved.luckyNumbers) ? saved.luckyNumbers : defaults.luckyNumbers),
    strategy: isLotteryStrategy(saved.strategy) ? saved.strategy : defaults.strategy,
  };

  if (isCalendarMode(saved.targetCalendar) || defaults.targetCalendar) {
    form.targetCalendar = isCalendarMode(saved.targetCalendar) ? saved.targetCalendar : defaults.targetCalendar;
  }

  if (typeof saved.targetLeapMonth === 'boolean' || typeof defaults.targetLeapMonth === 'boolean') {
    form.targetLeapMonth = typeof saved.targetLeapMonth === 'boolean' ? saved.targetLeapMonth : defaults.targetLeapMonth;
  }

  return form;
}

function toPersistedForm(form: LotteryInput): PersistedForm {
  return {
    birthDate: form.birthDate,
    birthTime: form.birthTime,
    birthCalendar: form.birthCalendar ?? 'solar',
    birthLeapMonth: Boolean(form.birthLeapMonth),
    gender: form.gender,
    birthPlace: normalizeBirthPlace(form.birthPlace),
    useTrueSolarTime: Boolean(form.useTrueSolarTime),
    birthTimeAccuracy: form.birthTimeAccuracy,
    luckyNumbers: normalizeLuckyNumbers(form.luckyNumbers),
    strategy: form.strategy,
  };
}

function normalizeBirthPlace(value: unknown, fallback?: string): string | undefined {
  if (typeof value === 'string') {
    return value.trim();
  }

  return typeof fallback === 'string' ? fallback.trim() : fallback;
}

function isDateString(value: unknown): value is string {
  return typeof value === 'string' && datePattern.test(value);
}

function isTimeString(value: unknown): value is string {
  return typeof value === 'string' && timePattern.test(value);
}

function isCalendarMode(value: unknown): value is CalendarMode {
  return typeof value === 'string' && calendarModes.has(value as CalendarMode);
}

function isBirthGender(value: unknown): value is BirthGender {
  return typeof value === 'string' && birthGenders.has(value as BirthGender);
}

function isBirthTimeAccuracy(value: unknown): value is BirthTimeAccuracy {
  return typeof value === 'string' && birthTimeAccuracies.has(value as BirthTimeAccuracy);
}

function isLotteryStrategy(value: unknown): value is LotteryStrategy {
  return typeof value === 'string' && strategies.has(value as LotteryStrategy);
}
