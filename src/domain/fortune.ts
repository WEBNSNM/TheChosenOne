import {
  type AlmanacInfo,
  type BaziInput,
  type BaziProfile,
  type ElementName,
  getBaziProfile,
} from './bazi';

export type FortuneLevel = 'great' | 'good' | 'steady' | 'cautious';

export interface DailyFortuneResult {
  score: number;
  level: FortuneLevel;
  label: string;
  summary: string;
  suitable: string[];
  avoid: string[];
  personalFocus: string;
  almanac: AlmanacInfo;
  profile: BaziProfile;
}

interface RelationAdvice {
  score: number;
  text: string;
  suitable: string[];
  avoid: string[];
}

const GENERATES: Record<ElementName, ElementName> = {
  木: '火',
  火: '土',
  土: '金',
  金: '水',
  水: '木',
};

const CONTROLS: Record<ElementName, ElementName> = {
  木: '土',
  土: '水',
  水: '火',
  火: '金',
  金: '木',
};

const LEVEL_LABELS: Record<FortuneLevel, string> = {
  great: '大吉',
  good: '吉',
  steady: '平稳',
  cautious: '宜慎',
};

export function analyzeDailyFortune(input: BaziInput): DailyFortuneResult {
  const profile = getBaziProfile(input);
  const almanac = profile.targetInfo.almanac;
  const relation = getRelationAdvice(profile.dayMaster.element, profile.transit.day.element);
  const yellowBonus = almanac.tianShenType === '黄道' ? 16 : -10;
  const spiritScore = clamp(almanac.jiShen.length - almanac.xiongSha.length, -5, 5);
  const rhythmScore = getRhythmScore(profile);
  const rawScore = clamp(
    48 + yellowBonus + almanac.yi.length * 2.6 - almanac.ji.length * 1.8 + relation.score + spiritScore + rhythmScore,
    1,
    100,
  );
  const score = Math.round(
    almanac.tianShenType === '黑道'
      ? clamp(rawScore - 8, 35, 68)
      : clamp(rawScore, 42, 95),
  );
  const level = getLevel(score);
  const suitable = uniq([...relation.suitable, ...almanac.yi]).slice(0, 7);
  const avoid = uniq([...relation.avoid, ...almanac.ji]).slice(0, 7);

  return {
    score,
    level,
    label: LEVEL_LABELS[level],
    summary: `今日${almanac.tianShen}${almanac.tianShenType}，${almanac.zhiXing}日，冲${almanac.clash}，煞${almanac.sha}，整体${LEVEL_LABELS[level]}。`,
    suitable,
    avoid,
    personalFocus: `日主${profile.dayMaster.stem}${profile.dayMaster.element}遇流日${profile.transit.day.label}${profile.transit.day.element}，${relation.text}`,
    almanac,
    profile,
  };
}

function getRhythmScore(profile: BaziProfile): number {
  const birthDay = profile.birth.day;
  const flowDay = profile.transit.day;
  const flowMonth = profile.transit.month;
  const signal =
    birthDay.stemIndex * 7
    + birthDay.branchIndex * 5
    + flowDay.stemIndex * 3
    + flowDay.branchIndex * 2
    + flowMonth.branchIndex;

  return signal % 13 - 6;
}

function getRelationAdvice(dayMaster: ElementName, flow: ElementName): RelationAdvice {
  if (flow === dayMaster) {
    return {
      score: 4,
      text: '同气相逢，适合稳住节奏、复盘协作，把已有资源用扎实。',
      suitable: ['复盘规划', '团队协作', '整理资料'],
      avoid: ['情绪争执', '重复投入'],
    };
  }

  if (GENERATES[flow] === dayMaster) {
    return {
      score: 9,
      text: '印星来扶，适合学习吸收、准备证照、处理需要耐心的事务。',
      suitable: ['学习进修', '资料准备', '拜访长辈'],
      avoid: ['仓促承诺', '过度依赖'],
    };
  }

  if (GENERATES[dayMaster] === flow) {
    return {
      score: 7,
      text: '食伤外放，适合表达创作、发布内容、把想法拿出来试水。',
      suitable: ['表达创作', '沟通展示', '产品发布'],
      avoid: ['口舌冲动', '过度消耗'],
    };
  }

  if (CONTROLS[dayMaster] === flow) {
    return {
      score: 11,
      text: '财星显露，适合盘点收益、推进合作、处理预算和资源配置。',
      suitable: ['理财盘点', '商务合作', '资源配置'],
      avoid: ['冲动消费', '高杠杆决策'],
    };
  }

  if (CONTROLS[flow] === dayMaster) {
    return {
      score: -5,
      text: '官杀临身，适合守规则、办流程、做风险控制，不宜硬碰硬。',
      suitable: ['流程办理', '风险检查', '遵规执行'],
      avoid: ['冒进决策', '正面冲突'],
    };
  }

  return {
    score: 2,
    text: '五行气机平缓，适合处理日常事务，少折腾也能有进展。',
    suitable: ['日常推进', '清单整理', '轻量沟通'],
    avoid: ['临时变更', '分心拖延'],
  };
}

function getLevel(score: number): FortuneLevel {
  if (score >= 78) return 'great';
  if (score >= 62) return 'good';
  if (score >= 45) return 'steady';
  return 'cautious';
}

function uniq(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => Boolean(value) && value !== '无')));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
