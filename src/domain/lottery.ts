import {
  type BaziInput,
  type BaziProfile,
  ELEMENTS,
  type ElementName,
  getBaziProfile,
  getEmptyElementCounts,
} from './bazi';
import { analyzeDailyFortune, type DailyFortuneResult } from './fortune';

export type LotteryStrategy = 'balance' | 'wealth' | 'bold';

export interface LotteryInput extends BaziInput {
  strategy: LotteryStrategy;
  luckyNumbers?: number[];
}

export interface LotteryBall {
  value: number;
  element: ElementName;
  score: number;
}

export interface LuckyLotteryResult {
  reds: LotteryBall[];
  blue: LotteryBall;
  score: number;
  profile: BaziProfile;
  dailyFortune: DailyFortuneResult;
  luckyElements: ElementName[];
  summary: string;
  advice: string;
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

const NUMBER_ELEMENT_BY_LAST_DIGIT: Record<number, ElementName> = {
  0: '土',
  1: '水',
  2: '火',
  3: '木',
  4: '金',
  5: '土',
  6: '水',
  7: '火',
  8: '木',
  9: '金',
};

const STRATEGY_LABELS: Record<LotteryStrategy, string> = {
  balance: '五行调和',
  wealth: '财星优先',
  bold: '流日冲劲',
};

export function generateLuckyLottery(input: LotteryInput): LuckyLotteryResult {
  const profile = getBaziProfile(input);
  const dailyFortune = analyzeDailyFortune(input);
  const luckyNumberDigits = normalizeLuckyNumbers(input.luckyNumbers);
  const seed = createSeed(input, profile);
  const rng = mulberry32(seed);
  const luckyElements = getLuckyElements(profile, input.strategy);
  const redCandidates = createCandidates(33, profile, luckyElements, luckyNumberDigits, input.strategy, rng, 6);
  const blueCandidates = createCandidates(16, profile, luckyElements, luckyNumberDigits, input.strategy, rng, 1);
  const reds = redCandidates.slice(0, 6).sort((a, b) => a.value - b.value);
  const blue = blueCandidates[0];
  const average = reds.reduce((sum, ball) => sum + ball.score, blue.score) / 7;
  const score = clamp(Math.round(52 + average / 2.8 + rng() * 8), 58, 96);

  return {
    reds,
    blue,
    score,
    profile,
    dailyFortune,
    luckyElements,
    summary: `本命日主${profile.dayMaster.stem}${profile.dayMaster.element}，流日${profile.transit.day.label}，取${STRATEGY_LABELS[input.strategy]}。`,
    advice: `${dailyFortune.label}日宜取${luckyElements.join('、')}气，红球重均衡，蓝球取一枚点睛。`,
  };
}

export function getNumberElement(value: number): ElementName {
  return NUMBER_ELEMENT_BY_LAST_DIGIT[value % 10];
}

function createCandidates(
  max: number,
  profile: BaziProfile,
  luckyElements: ElementName[],
  luckyNumberDigits: number[],
  strategy: LotteryStrategy,
  rng: () => number,
  count: number,
): LotteryBall[] {
  return Array.from({ length: max }, (_, index) => {
    const value = index + 1;
    const element = getNumberElement(value);
    const score = getElementScore(element, profile, luckyElements, strategy)
      + getHarmonicScore(value, profile, count)
      + getLuckyNumberScore(value, luckyNumberDigits)
      + rng() * 18;

    return {
      value,
      element,
      score: Number(score.toFixed(3)),
    };
  }).sort((first, second) => second.score - first.score || first.value - second.value);
}

function getLuckyElements(profile: BaziProfile, strategy: LotteryStrategy): ElementName[] {
  const dayMaster = profile.dayMaster.element;
  const wealth = CONTROLS[dayMaster];
  const output = GENERATES[dayMaster];
  const resource = getResourceElement(dayMaster);
  const lowElements = getLowestBirthElements(profile);
  const flowElement = profile.transit.day.element;
  const candidates =
    strategy === 'wealth'
      ? [wealth, flowElement, output, lowElements[0]]
      : strategy === 'bold'
        ? [flowElement, output, wealth, lowElements[0]]
        : [lowElements[0], flowElement, resource, wealth];

  return Array.from(new Set(candidates)).slice(0, 3);
}

function getElementScore(
  element: ElementName,
  profile: BaziProfile,
  luckyElements: ElementName[],
  strategy: LotteryStrategy,
): number {
  const dayMaster = profile.dayMaster.element;
  const wealth = CONTROLS[dayMaster];
  const output = GENERATES[dayMaster];
  const resource = getResourceElement(dayMaster);
  const flowElement = profile.transit.day.element;
  const lowElements = getLowestBirthElements(profile);
  let score = 12;

  if (luckyElements.includes(element)) score += 18;
  if (element === flowElement) score += strategy === 'bold' ? 14 : 8;
  if (element === wealth) score += strategy === 'wealth' ? 16 : 8;
  if (element === output) score += strategy === 'bold' ? 12 : 5;
  if (element === resource && strategy === 'balance') score += 7;
  if (lowElements.includes(element)) score += 6;

  return score;
}

function getLowestBirthElements(profile: BaziProfile): ElementName[] {
  const counts = profile.birth.elementCounts;
  return [...ELEMENTS].sort((first, second) => counts[first] - counts[second] || first.localeCompare(second));
}

function getResourceElement(element: ElementName): ElementName {
  return (Object.entries(GENERATES).find(([, generated]) => generated === element)?.[0] ?? '木') as ElementName;
}

function getHarmonicScore(value: number, profile: BaziProfile, count: number): number {
  const birthSignal = profile.birth.day.stemIndex + profile.birth.hour.stemIndex + profile.birth.month.branchIndex;
  const flowSignal = profile.transit.day.branchIndex + profile.transit.month.stemIndex + profile.transit.year.branchIndex;
  const palace = ((birthSignal * 3 + flowSignal * 5) % (count === 1 ? 16 : 33)) + 1;
  const distance = Math.abs(value - palace);
  const mirrorDistance = Math.min(distance, Math.abs(value + (count === 1 ? 16 : 33) - palace));

  return Math.max(0, 12 - mirrorDistance * 1.4);
}

function createSeed(input: LotteryInput, profile: BaziProfile): number {
  const seedParts = [
    input.birthDate,
    input.birthTime,
    input.birthCalendar ?? 'solar',
    input.birthLeapMonth ? 'leap' : 'normal',
    input.targetDate,
    input.strategy,
    profile.birthInfo.solarDate,
    profile.targetInfo.solarDate,
    profile.birth.pillars.map((pillar) => pillar.label).join(''),
    profile.transit.pillars.map((pillar) => pillar.label).join(''),
    Object.values(profile.birth.elementCounts).join(''),
    Object.values(getEmptyElementCounts()).join(''),
  ];
  const luckyNumberSeedSegment = getLuckyNumberSeedSegment(input.luckyNumbers);

  if (luckyNumberSeedSegment) {
    seedParts.splice(6, 0, luckyNumberSeedSegment);
  }

  return hashString(seedParts.join('|'));
}

export function getLuckyNumberSeedSegment(values?: number[]): string | undefined {
  const normalized = normalizeLuckyNumbers(values);

  return normalized.length > 0 ? `lucky:${normalized.join(',')}` : undefined;
}

export function normalizeLuckyNumbers(values?: number[]): number[] {
  if (!Array.isArray(values)) return [];

  return Array.from(
    new Set(values.filter((value) => Number.isInteger(value) && value >= 0 && value <= 9)),
  ).sort((first, second) => first - second);
}

function getLuckyNumberScore(value: number, luckyNumberDigits: number[]): number {
  if (luckyNumberDigits.length === 0) return 0;

  const numberText = String(value);
  const matched = luckyNumberDigits.some((digit) => numberText.includes(String(digit)));
  const exact = luckyNumberDigits.includes(value);

  return (matched ? 42 : 0) + (exact ? 10 : 0);
}

function hashString(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  return () => {
    let next = seed += 0x6d2b79f5;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
