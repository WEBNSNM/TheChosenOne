import { describe, expect, it } from 'vitest';
import { buildConsultationMessages, consultationScenes } from '../../src/domain/consultation';
import { generateLuckyLottery } from '../../src/domain/lottery';

const input = {
  birthDate: '1992-08-08',
  birthTime: '08:30',
  birthCalendar: 'solar' as const,
  gender: 'male' as const,
  birthPlace: '杭州',
  useTrueSolarTime: true,
  birthTimeAccuracy: 'exact' as const,
  targetDate: '2026-05-09',
  strategy: 'balance' as const,
};

describe('consultation scenes', () => {
  it('defines the paid-consultation-ready scenes', () => {
    expect(consultationScenes).toHaveLength(9);
    expect(consultationScenes.map((scene) => scene.id)).toEqual([
      'premium-chart-report',
      'screenshot-reading',
      'daily-depth',
      'rhythm-report',
      'element-personality',
      'relationship-observation',
      'career-rhythm',
      'follow-up-chat',
      'learning-coach',
    ]);
  });

  it('builds messages with current chart context and scene guardrails', () => {
    const result = generateLuckyLottery(input);
    const messages = buildConsultationMessages({
      sceneId: 'daily-depth',
      result,
      form: input,
      userText: '今天适合推进内容发布吗？',
      screenshotText: '',
    });
    const text = JSON.stringify(messages);

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
    expect(text).toContain('今日流日');
    expect(text).toContain(result.profile.transit.day.label);
    expect(text).toContain('性别：男');
    expect(text).toContain('出生地：杭州');
    expect(text).toContain('真太阳时：已开启');
    expect(text).toContain('出生时间准确度：准确');
    expect(text).toContain('今天适合推进内容发布吗？');
    expect(text).not.toMatch(/彩票|中奖|下注|稳赚|必中|暴富/);
  });
});
