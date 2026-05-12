import { describe, expect, it } from 'vitest';
import {
  getBaziProfile,
  getDayPillar,
  getHourPillar,
  getYearPillar,
  parseLocalDate,
} from '../../src/domain/bazi';

describe('bazi pillar calculations', () => {
  it('uses the solar year boundary near Li Chun for year pillars', () => {
    expect(getYearPillar(parseLocalDate('2024-02-03')).label).toBe('癸卯');
    expect(getYearPillar(parseLocalDate('2024-02-05')).label).toBe('甲辰');
  });

  it('calculates a stable sexagenary day pillar from a known reference day', () => {
    expect(getDayPillar(parseLocalDate('2000-01-01')).label).toBe('戊午');
  });

  it('derives hour branches from two-hour windows', () => {
    expect(getHourPillar(parseLocalDate('2024-05-20', '23:20')).branch).toBe('子');
    expect(getHourPillar(parseLocalDate('2024-05-20', '08:30')).branch).toBe('辰');
  });

  it('builds a birth and transit profile with complete element counts', () => {
    const profile = getBaziProfile({
      birthDate: '1992-08-08',
      birthTime: '08:30',
      birthCalendar: 'solar',
      targetDate: '2026-05-09',
    });

    expect(profile.birth.pillars).toHaveLength(4);
    expect(profile.transit.pillars).toHaveLength(3);
    expect(Object.keys(profile.birth.elementCounts).sort()).toEqual(['土', '木', '水', '火', '金']);
    expect(profile.dayMaster.element).toMatch(/[木火土金水]/);
    expect(profile.birthInfo.solarDate).toBe('1992-08-08');
    expect(profile.targetInfo.lunarDateText).toBe('丙午年三月廿三');
    expect(profile.targetInfo.almanac.tianShenType).toMatch(/黄道|黑道/);
  });

  it('formats the target lunar date with the lunar year stem-branch instead of a confusing numeric year', () => {
    const profile = getBaziProfile({
      birthDate: '1992-08-08',
      birthTime: '08:30',
      birthCalendar: 'solar',
      targetDate: '2026-05-12',
    });

    expect(profile.targetInfo.solarDate).toBe('2026-05-12');
    expect(profile.targetInfo.lunarDateText).toBe('丙午年三月廿六');
  });

  it('converts lunar birthday input before building the birth chart', () => {
    const profile = getBaziProfile({
      birthDate: '2019-12-12',
      birthTime: '11:22',
      birthCalendar: 'lunar',
      targetDate: '2026-05-09',
    });

    expect(profile.birthInfo.solarDate).toBe('2020-01-06');
    expect(profile.birth.pillars.map((pillar) => pillar.label)).toEqual(['己亥', '丁丑', '戊申', '戊午']);
  });
});
