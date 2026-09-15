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

export const GROWTH_REPORT_DISCLAIMER = '本报告用于个人成长反思与行动规划；传统历法文化背景信息仅作文化参考，不构成确定性预测，也不替代医疗、法律或投资等专业建议。';

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
      : `可选补充${missing.join('、')}，帮助完善传统历法文化背景信息。`,
  };
}

export function getPremiumReportSections(): PremiumReportSection[] {
  return [
    {
      title: '能力倾向',
      subtitle: '结合职业与现实经历，梳理可能的优势、偏好和可验证线索。',
      items: ['工作偏好', '协作方式', '能力线索'],
    },
    {
      title: '阶段观察',
      subtitle: '围绕当前关注、目标和困难，提出阶段性假设与情景规划。',
      items: ['阶段主题', '关键变量', '30 天观察'],
    },
    {
      title: '事业行动建议',
      subtitle: '把洞察转成职业场景中的优先级、沟通和小步实验。',
      items: ['本周重点', '沟通策略', '行动实验'],
    },
    {
      title: '金钱行动建议',
      subtitle: '反思金钱决策习惯、资源配置和风险意识，不承诺财务结果。',
      items: ['决策习惯', '资源配置', '风险意识'],
    },
    {
      title: '风险与不确定性提示',
      subtitle: '标明信息边界、可变因素和需要专业支持的事项。',
      items: ['不确定性', '验证方式', '专业支持'],
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
