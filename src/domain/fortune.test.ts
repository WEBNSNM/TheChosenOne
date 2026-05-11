import { describe, expect, it } from 'vitest';
import { analyzeDailyFortune } from './fortune';

describe('daily fortune analysis', () => {
  it('combines almanac signals with the birth chart', () => {
    const result = analyzeDailyFortune({
      birthDate: '1992-08-08',
      birthTime: '08:30',
      birthCalendar: 'solar',
      targetDate: '2026-05-09',
    });

    expect(result.score).toBeGreaterThanOrEqual(1);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.level).toMatch(/great|good|steady|cautious/);
    expect(result.suitable.length).toBeGreaterThan(0);
    expect(result.avoid.length).toBeGreaterThan(0);
    expect(result.summary).toContain('今日');
    expect(result.personalFocus).toContain(result.profile.dayMaster.element);
    expect(result.almanac.tianShenType).toMatch(/黄道|黑道/);
  });

  it('does not call black-road days great even when the almanac has many suitable items', () => {
    const result = analyzeDailyFortune({
      birthDate: '1992-08-08',
      birthTime: '08:30',
      birthCalendar: 'solar',
      targetDate: '2026-05-11',
    });

    expect(result.almanac.tianShenType).toBe('黑道');
    expect(result.level).not.toBe('great');
    expect(result.avoid).not.toContain('无');
  });
});
