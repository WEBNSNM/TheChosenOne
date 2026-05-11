import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const userFacingFiles = [
  'index.html',
  'src/App.vue',
  'src/components/FortuneBoard.vue',
  'src/components/FortuneForm.vue',
  'public/poster.svg',
  'public/poster-export.html',
];

const sensitiveCopy = [
  '双色球',
  '彩票',
  '购彩',
  '预测',
  '选号',
  '开奖',
  '中奖',
  '出手',
  '下注',
  '稳赚',
  '必中',
  '暴富',
  '代购',
  '合买',
  '出票',
  'DOUBLE COLOR BALL',
];

describe('user-facing copy safety', () => {
  it('keeps public copy away from high-risk lottery prediction wording', () => {
    const violations = userFacingFiles.flatMap((file) => {
      const content = readFileSync(resolve(process.cwd(), file), 'utf8');

      return sensitiveCopy
        .filter((word) => content.includes(word))
        .map((word) => `${file}: ${word}`);
    });

    expect(violations).toEqual([]);
  });
});
