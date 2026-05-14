import { describe, expect, it } from 'vitest';
import {
  buildConsultationMessages,
  consultationScenes,
  isUserProfileFilled,
  sceneRequiresUserProfile,
} from '../../src/domain/consultation';
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
  it('defines the two core consultation scenes', () => {
    expect(consultationScenes).toHaveLength(2);
    expect(consultationScenes.map((scene) => scene.id)).toEqual([
      'premium-chart-report',
      'screenshot-reading',
    ]);
  });

  it('builds messages with current chart context and scene guardrails', () => {
    const result = generateLuckyLottery(input);
    const messages = buildConsultationMessages({
      sceneId: 'premium-chart-report',
      result,
      form: input,
      userText: '重点看事业节奏和关系沟通。',
      screenshotText: '',
    });
    const text = JSON.stringify(messages);

    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('system');
    expect(messages[1].role).toBe('user');
    expect(text).toContain(result.profile.transit.day.label);
    expect(text).toContain('性别：男');
    expect(text).toContain('出生地：杭州');
    expect(text).toContain('真太阳时：已开启');
    expect(text).toContain('出生时间准确度：准确');
    expect(text).toContain('十神');
    expect(text).toContain('藏干');
    expect(text).toContain('大运');
    expect(text).toContain('纳音');
    expect(text).toContain('重点看事业节奏和关系沟通。');
    expect(text).not.toMatch(/彩票|中奖|下注|稳赚|必中|暴富/);
  });

  it('requires personal background only for deep report scene', () => {
    expect(sceneRequiresUserProfile('screenshot-reading')).toBe(false);
    expect(sceneRequiresUserProfile('premium-chart-report')).toBe(true);

    expect(isUserProfileFilled({
      nickname: '',
      occupation: '',
      customNote: '',
    })).toBe(false);
    expect(isUserProfileFilled({
      nickname: '',
      occupation: '',
      customNote: '最近关注事业发展',
    })).toBe(true);
  });
});
