import { Lunar, Solar, type LunarDate, type SolarDate } from 'lunar-javascript';

export const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
export const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;
export const ELEMENTS = ['木', '火', '土', '金', '水'] as const;

export type HeavenlyStem = (typeof HEAVENLY_STEMS)[number];
export type EarthlyBranch = (typeof EARTHLY_BRANCHES)[number];
export type ElementName = (typeof ELEMENTS)[number];
export type CalendarMode = 'solar' | 'lunar';
export type BirthGender = 'male' | 'female' | 'unspecified';
export type BirthTimeAccuracy = 'exact' | 'approximate' | 'unknown';

export interface Pillar {
  stem: HeavenlyStem;
  branch: EarthlyBranch;
  stemIndex: number;
  branchIndex: number;
  element: ElementName;
  label: string;
}

export interface BaziInput {
  customerName?: string;
  birthDate: string;
  birthTime: string;
  birthCalendar?: CalendarMode;
  birthLeapMonth?: boolean;
  gender?: BirthGender;
  birthPlace?: string;
  useTrueSolarTime?: boolean;
  birthTimeAccuracy?: BirthTimeAccuracy;
  targetDate: string;
  targetCalendar?: CalendarMode;
  targetLeapMonth?: boolean;
}

export interface PillarSet {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  hour?: Pillar;
  pillars: Pillar[];
  elementCounts: Record<ElementName, number>;
}

export interface BaziProfile {
  birth: PillarSet & { hour: Pillar };
  transit: PillarSet;
  birthInfo: ResolvedCalendarInfo;
  targetInfo: ResolvedCalendarInfo & {
    almanac: AlmanacInfo;
  };
  dayMaster: {
    stem: HeavenlyStem;
    element: ElementName;
  };
  advanced?: AdvancedBaziData;
  daYun?: DaYunData;
}

export interface ResolvedCalendarInfo {
  inputDate: string;
  calendar: CalendarMode;
  isLeapMonth: boolean;
  solarDate: string;
  lunarText: string;
  lunarDateText: string;
}

export interface ShiShenInfo {
  gan: string;
  zhiHidden: string[];
}

export interface AdvancedBaziData {
  shiShen: { year: ShiShenInfo; month: ShiShenInfo; day: ShiShenInfo; hour: ShiShenInfo };
  hideGan: { year: string[]; month: string[]; day: string[]; hour: string[] };
  naYin: { year: string; month: string; day: string; hour: string };
  diShi: { year: string; month: string; day: string; hour: string };
  palaces: { ming: string; mingNaYin: string; shen: string; shenNaYin: string };
  kongWang: { day: string; time: string };
}

export interface DaYunItem {
  startAge: number;
  endAge: number;
  ganZhi: string;
}

export interface DaYunData {
  forward: boolean;
  items: DaYunItem[];
  currentGanZhi: string;
}

export interface AlmanacInfo {
  yi: string[];
  ji: string[];
  jiShen: string[];
  xiongSha: string[];
  dayGanZhi: string;
  dayAnimal: string;
  clash: string;
  sha: string;
  liuYao: string;
  zhiXing: string;
  tianShen: string;
  tianShenType: string;
}

const STEM_ELEMENTS: Record<HeavenlyStem, ElementName> = {
  甲: '木',
  乙: '木',
  丙: '火',
  丁: '火',
  戊: '土',
  己: '土',
  庚: '金',
  辛: '金',
  壬: '水',
  癸: '水',
};

const BRANCH_ELEMENTS: Record<EarthlyBranch, ElementName> = {
  子: '水',
  丑: '土',
  寅: '木',
  卯: '木',
  辰: '土',
  巳: '火',
  午: '火',
  未: '土',
  申: '金',
  酉: '金',
  戌: '土',
  亥: '水',
};

export function parseLocalDate(date: string, time = '12:00'): Date {
  const { year, month, day } = parseDateParts(date);
  const { hour, minute } = parseTimeParts(time);

  if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) {
    throw new Error('请输入有效的公历日期与时间');
  }

  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

export function getYearPillar(date: Date): Pillar {
  return createPillarFromLabel(getEightChar(date).getYear());
}

export function getMonthPillar(date: Date): Pillar {
  return createPillarFromLabel(getEightChar(date).getMonth());
}

export function getDayPillar(date: Date): Pillar {
  return createPillarFromLabel(getEightChar(date).getDay());
}

export function getHourPillar(date: Date): Pillar {
  return createPillarFromLabel(getEightChar(date).getTime());
}

export function getBaziProfile(input: BaziInput): BaziProfile {
  const birthResolved = resolveCalendarDate(
    input.birthDate,
    input.birthTime,
    input.birthCalendar ?? 'solar',
    input.birthLeapMonth ?? false,
  );
  const targetResolved = resolveCalendarDate(
    input.targetDate,
    '12:00',
    input.targetCalendar ?? 'solar',
    input.targetLeapMonth ?? false,
  );
  const birthDateTime = solarToDate(birthResolved.solar);
  const targetDate = solarToDate(targetResolved.solar);
  const birthHour = getHourPillar(birthDateTime);
  const birth = createPillarSet(
    getYearPillar(birthDateTime),
    getMonthPillar(birthDateTime),
    getDayPillar(birthDateTime),
    birthHour,
  ) as PillarSet & { hour: Pillar };
  const transit = createPillarSet(
    getYearPillar(targetDate),
    getMonthPillar(targetDate),
    getDayPillar(targetDate),
  );

  return {
    birth,
    transit,
    birthInfo: toResolvedInfo(birthResolved),
    targetInfo: {
      ...toResolvedInfo(targetResolved),
      almanac: getAlmanacInfo(targetDate),
    },
    dayMaster: {
      stem: birth.day.stem,
      element: birth.day.element,
    },
    advanced: getAdvancedBaziData(birthDateTime),
    daYun: getDaYunData(birthDateTime, input.gender ?? 'unspecified'),
  };
}

export function getAlmanacInfo(date: Date): AlmanacInfo {
  const lunar = getLunar(date);

  return {
    yi: lunar.getDayYi(),
    ji: lunar.getDayJi(),
    jiShen: lunar.getDayJiShen(),
    xiongSha: lunar.getDayXiongSha(),
    dayGanZhi: lunar.getDayInGanZhi(),
    dayAnimal: lunar.getDayShengXiao(),
    clash: lunar.getChongDesc(),
    sha: lunar.getSha(),
    liuYao: lunar.getLiuYao(),
    zhiXing: lunar.getZhiXing(),
    tianShen: lunar.getDayTianShen(),
    tianShenType: lunar.getDayTianShenType(),
  };
}

export function getAdvancedBaziData(date: Date): AdvancedBaziData {
  const ec = getEightChar(date);

  return {
    shiShen: {
      year: { gan: ec.getYearShiShenGan(), zhiHidden: ec.getYearShiShenZhi() },
      month: { gan: ec.getMonthShiShenGan(), zhiHidden: ec.getMonthShiShenZhi() },
      day: { gan: ec.getDayShiShenGan(), zhiHidden: ec.getDayShiShenZhi() },
      hour: { gan: ec.getTimeShiShenGan(), zhiHidden: ec.getTimeShiShenZhi() },
    },
    hideGan: {
      year: ec.getYearHideGan(),
      month: ec.getMonthHideGan(),
      day: ec.getDayHideGan(),
      hour: ec.getTimeHideGan(),
    },
    naYin: {
      year: ec.getYearNaYin(),
      month: ec.getMonthNaYin(),
      day: ec.getDayNaYin(),
      hour: ec.getTimeNaYin(),
    },
    diShi: {
      year: ec.getYearDiShi(),
      month: ec.getMonthDiShi(),
      day: ec.getDayDiShi(),
      hour: ec.getTimeDiShi(),
    },
    palaces: {
      ming: ec.getMingGong(),
      mingNaYin: ec.getMingGongNaYin(),
      shen: ec.getShenGong(),
      shenNaYin: ec.getShenGongNaYin(),
    },
    kongWang: {
      day: ec.getDayXunKong(),
      time: ec.getTimeXunKong(),
    },
  };
}

export function getDaYunData(date: Date, gender: BirthGender): DaYunData {
  const ec = getEightChar(date);
  const genderNum = gender === 'female' ? 0 : 1;
  const yun = ec.getYun(genderNum, 2);
  const daYunList = yun.getDaYun();

  const now = new Date();
  const age = now.getFullYear() - date.getFullYear();

  const items: DaYunItem[] = [];
  let currentGanZhi = '';

  for (const dy of daYunList) {
    const ganZhi = dy.getGanZhi();
    if (!ganZhi) continue;

    const startAge = dy.getStartAge();
    const endAge = dy.getEndAge();
    items.push({ startAge, endAge, ganZhi });

    if (age >= startAge && age < endAge) {
      currentGanZhi = ganZhi;
    }
  }

  return {
    forward: yun.isForward(),
    items,
    currentGanZhi,
  };
}

export function getEmptyElementCounts(): Record<ElementName, number> {
  return {
    木: 0,
    火: 0,
    土: 0,
    金: 0,
    水: 0,
  };
}

function createPillarSet(year: Pillar, month: Pillar, day: Pillar, hour?: Pillar): PillarSet {
  const pillars = [year, month, day, hour].filter((pillar): pillar is Pillar => Boolean(pillar));
  const elementCounts = getEmptyElementCounts();

  for (const pillar of pillars) {
    elementCounts[pillar.element] += 1;
    elementCounts[BRANCH_ELEMENTS[pillar.branch]] += 1;
  }

  return {
    year,
    month,
    day,
    hour,
    pillars,
    elementCounts,
  };
}

function createPillarFromParts(stemIndex: number, branchIndex: number): Pillar {
  const stem = HEAVENLY_STEMS[stemIndex];
  const branch = EARTHLY_BRANCHES[branchIndex];

  return {
    stem,
    branch,
    stemIndex,
    branchIndex,
    element: STEM_ELEMENTS[stem],
    label: `${stem}${branch}`,
  };
}

function createPillarFromLabel(label: string): Pillar {
  const stem = label[0] as HeavenlyStem;
  const branch = label[1] as EarthlyBranch;
  const stemIndex = HEAVENLY_STEMS.indexOf(stem);
  const branchIndex = EARTHLY_BRANCHES.indexOf(branch);

  if (stemIndex < 0 || branchIndex < 0) {
    throw new Error(`无法识别干支：${label}`);
  }

  return createPillarFromParts(stemIndex, branchIndex);
}

function getEightChar(date: Date) {
  return getLunar(date).getEightChar();
}

function getLunar(date: Date): LunarDate {
  return Solar.fromYmdHms(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
  ).getLunar();
}

function resolveCalendarDate(
  date: string,
  time: string,
  calendar: CalendarMode,
  isLeapMonth: boolean,
): ResolvedCalendarInfo & { solar: SolarDate } {
  const { year, month, day } = parseDateParts(date);
  const { hour, minute } = parseTimeParts(time);
  const solar =
    calendar === 'lunar'
      ? Lunar.fromYmdHms(year, isLeapMonth ? -month : month, day, hour, minute, 0).getSolar()
      : Solar.fromYmdHms(year, month, day, hour, minute, 0);
  const lunar = solar.getLunar();

  return {
    inputDate: date,
    calendar,
    isLeapMonth,
    solar,
    solarDate: formatSolarDate(solar),
    lunarText: lunar.toString(),
    lunarDateText: formatLunarDateText(lunar),
  };
}

function toResolvedInfo(resolved: ResolvedCalendarInfo & { solar: SolarDate }): ResolvedCalendarInfo {
  return {
    inputDate: resolved.inputDate,
    calendar: resolved.calendar,
    isLeapMonth: resolved.isLeapMonth,
    solarDate: resolved.solarDate,
    lunarText: resolved.lunarText,
    lunarDateText: resolved.lunarDateText,
  };
}

function solarToDate(solar: SolarDate): Date {
  return new Date(
    solar.getYear(),
    solar.getMonth() - 1,
    solar.getDay(),
    solar.getHour(),
    solar.getMinute(),
    solar.getSecond(),
    0,
  );
}

function formatSolarDate(solar: SolarDate): string {
  return [
    solar.getYear(),
    String(solar.getMonth()).padStart(2, '0'),
    String(solar.getDay()).padStart(2, '0'),
  ].join('-');
}

function formatLunarDateText(lunar: LunarDate): string {
  const leap = lunar.getMonth() < 0 ? '闰' : '';

  return `${lunar.getYearInGanZhi()}年${leap}${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`;
}

function parseDateParts(date: string): { year: number; month: number; day: number } {
  const [year, month, day] = date.split('-').map(Number);

  if (!year || !month || !day) {
    throw new Error('请输入有效的日期');
  }

  return { year, month, day };
}

function parseTimeParts(time: string): { hour: number; minute: number } {
  const [hour, minute] = time.split(':').map(Number);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    throw new Error('请输入有效的时间');
  }

  return { hour, minute };
}
