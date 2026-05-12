import { describe, expect, it } from 'vitest';
import {
  getChartCalibrationItems,
  getPremiumReportSections,
  getPremiumReadiness,
} from '../../src/domain/premiumReport';
import type { LotteryInput } from '../../src/domain/lottery';

const baseInput: LotteryInput = {
  birthDate: '1992-08-08',
  birthTime: '08:30',
  birthCalendar: 'solar',
  gender: 'unspecified',
  birthPlace: '',
  useTrueSolarTime: false,
  birthTimeAccuracy: 'approximate',
  targetDate: '2026-05-09',
  strategy: 'balance',
};

describe('premium report helpers', () => {
  it('summarizes free chart calibration status', () => {
    const items = getChartCalibrationItems({
      ...baseInput,
      gender: 'female',
      birthPlace: '杭州',
      useTrueSolarTime: true,
      birthTimeAccuracy: 'exact',
    });

    expect(items.map((item) => item.label)).toEqual(['四柱', '性别', '出生地', '真太阳时', '出生时间']);
    expect(items.map((item) => item.status)).toContain('已记录');
    expect(items.find((item) => item.label === '真太阳时')?.status).toBe('已开启');
  });

  it('reports missing recommended profile details before paid reading', () => {
    expect(getPremiumReadiness(baseInput).missing).toEqual(['性别', '出生地']);
  });

  it('defines paid report sections for advanced chart interpretation', () => {
    expect(getPremiumReportSections().map((section) => section.title)).toEqual([
      '基础盘校准',
      '命盘结构',
      '高级参考',
      '时间节奏',
      '行动建议',
    ]);
  });
});
