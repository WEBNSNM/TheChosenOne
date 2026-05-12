import { describe, expect, it } from 'vitest';
import type { LotteryInput } from '../../src/domain/lottery';
import { loadSavedForm, saveForm } from '../../src/domain/formStorage';

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
      gender: 'female',
      birthPlace: '杭州',
      useTrueSolarTime: true,
      birthTimeAccuracy: 'exact',
      targetDate: '2026-05-25',
      luckyNumbers: [8, 6, 8, -1, 12],
      strategy: 'wealth',
    };

    saveForm(saved, storage);

    expect(loadSavedForm(defaults, storage)).toEqual({
      ...saved,
      targetDate: defaults.targetDate,
      luckyNumbers: [6, 8],
    });
  });

  it('sanitizes optional chart calibration fields', () => {
    const storage = new MemoryStorage();
    storage.setItem('the-chosen-one:fortune-form', JSON.stringify({
      birthDate: '1990-02-03',
      birthTime: '06:45',
      birthCalendar: 'solar',
      gender: 'robot',
      birthPlace: '  成都  ',
      useTrueSolarTime: true,
      birthTimeAccuracy: 'maybe',
      strategy: 'bold',
      luckyNumbers: [9],
    }));

    expect(loadSavedForm(defaults, storage)).toEqual({
      ...defaults,
      birthDate: '1990-02-03',
      birthTime: '06:45',
      gender: defaults.gender,
      birthPlace: '成都',
      useTrueSolarTime: true,
      birthTimeAccuracy: defaults.birthTimeAccuracy,
      luckyNumbers: [9],
      strategy: 'bold',
    });
  });

  it('does not persist a stale target date across app launches', () => {
    const storage = new MemoryStorage();

    saveForm({
      ...defaults,
      targetDate: '2026-05-25',
      birthDate: '1990-02-03',
    }, storage);

    expect(loadSavedForm({ ...defaults, targetDate: '2026-05-12' }, storage)).toMatchObject({
      birthDate: '1990-02-03',
      targetDate: '2026-05-12',
    });
  });

  it('falls back to defaults when saved data is malformed', () => {
    const storage = new MemoryStorage();
    storage.setItem('the-chosen-one:fortune-form', '{bad json');

    expect(loadSavedForm(defaults, storage)).toEqual(defaults);
  });
});
