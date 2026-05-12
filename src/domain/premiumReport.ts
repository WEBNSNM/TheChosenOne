import type { BirthGender, BirthTimeAccuracy } from './bazi';
import type { LotteryInput } from './lottery';

export type CalibrationTone = 'ready' | 'pending' | 'neutral';

export interface ChartCalibrationItem {
  label: string;
  status: string;
  detail: string;
  tone: CalibrationTone;
}

export interface PremiumReadiness {
  isReady: boolean;
  missing: string[];
  message: string;
}

export interface PremiumReportSection {
  title: string;
  subtitle: string;
  items: string[];
}

const genderLabels: Record<BirthGender, string> = {
  male: '男',
  female: '女',
  unspecified: '不透露',
};

const timeAccuracyLabels: Record<BirthTimeAccuracy, string> = {
  exact: '准确',
  approximate: '大概',
  unknown: '不确定时辰',
};

export function getChartCalibrationItems(form: LotteryInput): ChartCalibrationItem[] {
  const birthPlace = normalizeText(form.birthPlace);
  const gender = form.gender ?? 'unspecified';
  const timeAccuracy = form.birthTimeAccuracy ?? 'approximate';

  return [
    {
      label: '四柱',
      status: '已生成',
      detail: `${form.birthDate} ${form.birthTime}，${form.birthCalendar === 'lunar' ? '农历' : '阳历'}输入`,
      tone: 'ready',
    },
    {
      label: '性别',
      status: gender === 'unspecified' ? '未填写' : '已记录',
      detail: genderLabels[gender],
      tone: gender === 'unspecified' ? 'pending' : 'ready',
    },
    {
      label: '出生地',
      status: birthPlace ? '已记录' : '未填写',
      detail: birthPlace || '用于真太阳时和报告语境',
      tone: birthPlace ? 'ready' : 'pending',
    },
    {
      label: '真太阳时',
      status: form.useTrueSolarTime && birthPlace ? '已开启' : form.useTrueSolarTime ? '需出生地' : '未启用',
      detail: birthPlace ? '用于时辰交界校准提示' : '填写出生地后可开启',
      tone: form.useTrueSolarTime && birthPlace ? 'ready' : 'neutral',
    },
    {
      label: '出生时间',
      status: timeAccuracyLabels[timeAccuracy],
      detail: timeAccuracy === 'unknown' ? '解读会降低时柱断语强度' : '用于控制解读确定性',
      tone: timeAccuracy === 'unknown' ? 'pending' : 'ready',
    },
  ];
}

export function getPremiumReadiness(form: LotteryInput): PremiumReadiness {
  const missing = [
    form.gender && form.gender !== 'unspecified' ? '' : '性别',
    normalizeText(form.birthPlace) ? '' : '出生地',
  ].filter(Boolean);

  return {
    isReady: missing.length === 0,
    missing,
    message: missing.length === 0
      ? '资料完整，可生成更细的深度报告。'
      : `建议先补充${missing.join('、')}，深度报告会更稳。`,
  };
}

export function getPremiumReportSections(): PremiumReportSection[] {
  return [
    {
      title: '基础盘校准',
      subtitle: '四柱、历法换算、真太阳时开关与时辰可靠度说明。',
      items: ['四柱校对', '真太阳时提示', '时辰可靠度'],
    },
    {
      title: '命盘结构',
      subtitle: '把日主、五行、十神和藏干整理成可阅读的结构分析。',
      items: ['日主强弱', '十神关系', '藏干脉络'],
    },
    {
      title: '高级参考',
      subtitle: '补充神煞、命宫身宫、空亡、纳音等进阶参考。',
      items: ['神煞参考', '命宫身宫', '空亡纳音'],
    },
    {
      title: '时间节奏',
      subtitle: '围绕大运、流年、流月和今日流日形成阶段判断。',
      items: ['大运提示', '流年主题', '流月流日'],
    },
    {
      title: '行动建议',
      subtitle: '把命盘语言转成事业、关系、财务节奏和当天行动重点。',
      items: ['事业节奏', '关系沟通', '今日重点'],
    },
  ];
}

export function formatGender(value?: BirthGender): string {
  return genderLabels[value ?? 'unspecified'];
}

export function formatBirthTimeAccuracy(value?: BirthTimeAccuracy): string {
  return timeAccuracyLabels[value ?? 'approximate'];
}

function normalizeText(value?: string): string {
  return value?.trim() ?? '';
}
