import { describe, expect, it } from 'vitest';
import { generateLuckyLottery } from '../../src/domain/lottery';
import {
  SHARE_POSTER_TEMPLATES,
  createSharePosterModel,
  getSharePosterFileName,
} from '../../src/domain/sharePoster';

const input = {
  birthDate: '1992-08-08',
  birthTime: '08:30',
  birthCalendar: 'solar' as const,
  targetDate: '2026-05-09',
  strategy: 'balance' as const,
};

describe('share poster model', () => {
  it('contains the MVP daily fortune, suitable actions, element balance, and numbers', () => {
    const result = generateLuckyLottery(input);
    const model = createSharePosterModel(result, input.targetDate);

    expect(model.width).toBe(1080);
    expect(model.height).toBe(1920);
    expect(model.template.id).toBe('mystic');
    expect(model.fortuneLabel).toBe(result.dailyFortune.label);
    expect(model.suitable.length).toBeGreaterThan(0);
    expect(model.elementRows).toHaveLength(5);
    expect(model.redNumbers).toHaveLength(6);
    expect(model.blueNumber).toMatch(/^\d{2}$/);
  });

  it('offers three share poster templates with different model copy', () => {
    const result = generateLuckyLottery(input);
    const models = SHARE_POSTER_TEMPLATES.map((template) => createSharePosterModel(result, input.targetDate, template.id));

    expect(SHARE_POSTER_TEMPLATES.map((template) => template.id)).toEqual(['mystic', 'focus', 'soft']);
    expect(new Set(models.map((model) => model.template.id)).size).toBe(3);
    expect(new Set(models.map((model) => model.title)).size).toBe(3);
  });

  it('keeps public poster copy away from high-risk wording', () => {
    const result = generateLuckyLottery(input);
    const modelText = JSON.stringify(createSharePosterModel(result, input.targetDate));

    expect(modelText).not.toMatch(/双色球|彩票|购彩|预测|选号|开奖|中奖|出手|下注|稳赚|必中|暴富/);
  });

  it('creates a stable png file name', () => {
    expect(getSharePosterFileName('2026-05-09')).toBe('the-chosen-one-2026-05-09.png');
    expect(getSharePosterFileName('2026-05-09', 'focus')).toBe('the-chosen-one-focus-2026-05-09.png');
  });
});
