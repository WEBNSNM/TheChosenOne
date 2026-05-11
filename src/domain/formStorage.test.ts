import { describe, expect, it } from 'vitest';
import type { LotteryInput } from './lottery';
import { loadSavedForm, saveForm } from './formStorage';

const defaults: LotteryInput = {
  birthDate: '1992-08-08',
  birthTime: '08:30',
  birthCalendar: 'solar',
  birthLeapMonth: false,
  targetDate: '2026-05-11',
  strategy: 'balance',
};

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('form storage', () => {
  it('uses defaults when no saved form exists', () => {
    expect(loadSavedForm(defaults, new MemoryStorage())).toEqual(defaults);
  });

  it('restores a previously saved form', () => {
    const storage = new MemoryStorage();
    const saved: LotteryInput = {
      birthDate: '2019-12-12',
      birthTime: '11:22',
      birthCalendar: 'lunar',
      birthLeapMonth: true,
      targetDate: '2026-05-11',
      luckyNumbers: [8, 6, 8, -1, 12],
      strategy: 'wealth',
    };

    saveForm(saved, storage);

    expect(loadSavedForm(defaults, storage)).toEqual({
      ...saved,
      luckyNumbers: [6, 8],
    });
  });

  it('falls back to defaults when saved data is malformed', () => {
    const storage = new MemoryStorage();
    storage.setItem('the-chosen-one:fortune-form', '{bad json');

    expect(loadSavedForm(defaults, storage)).toEqual(defaults);
  });
});
