import { describe, expect, it } from 'vitest';
import { generateLuckyLottery, getLuckyNumberSeedSegment } from '../../src/domain/lottery';

const input = {
  birthDate: '1992-08-08',
  birthTime: '08:30',
  birthCalendar: 'solar' as const,
  targetDate: '2026-05-09',
  strategy: 'balance' as const,
};

describe('lucky lottery generation', () => {
  it('generates a valid double-color ball recommendation', () => {
    const result = generateLuckyLottery(input);

    expect(result.reds).toHaveLength(6);
    expect(new Set(result.reds.map((ball) => ball.value)).size).toBe(6);
    expect(result.reds.every((ball) => ball.value >= 1 && ball.value <= 33)).toBe(true);
    expect(result.blue.value).toBeGreaterThanOrEqual(1);
    expect(result.blue.value).toBeLessThanOrEqual(16);
    expect(result.dailyFortune.suitable.length).toBeGreaterThan(0);
  });

  it('is deterministic for the same birth data and target day', () => {
    expect(generateLuckyLottery(input)).toEqual(generateLuckyLottery(input));
  });

  it('keeps the existing generation when lucky numbers are not selected', () => {
    expect(generateLuckyLottery({ ...input, luckyNumbers: [] })).toEqual(generateLuckyLottery(input));
  });

  it('does not add a seed segment until lucky numbers are selected', () => {
    expect(getLuckyNumberSeedSegment()).toBeUndefined();
    expect(getLuckyNumberSeedSegment([])).toBeUndefined();
    expect(getLuckyNumberSeedSegment([8, 6, 8, -1, 12])).toBe('lucky:6,8');
  });

  it('uses selected lucky digits as a scoring signal', () => {
    const base = generateLuckyLottery(input);
    const lucky = generateLuckyLottery({
      ...input,
      luckyNumbers: [8],
    });
    const allValues = [...lucky.reds, lucky.blue].map((ball) => String(ball.value).padStart(2, '0'));

    expect(lucky.reds.map((ball) => ball.value)).not.toEqual(base.reds.map((ball) => ball.value));
    expect(allValues.some((value) => value.includes('8'))).toBe(true);
  });

  it('lets the flow day influence the recommendation', () => {
    const first = generateLuckyLottery(input);
    const next = generateLuckyLottery({
      ...input,
      targetDate: '2026-05-10',
    });

    expect(first.reds.map((ball) => ball.value)).not.toEqual(next.reds.map((ball) => ball.value));
  });
});
