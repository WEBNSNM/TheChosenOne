import type { AdvancedBaziData, DaYunData, ElementName } from './bazi';
import type { DeepSeekMessage } from './deepseekClient';
import type { LotteryInput, LuckyLotteryResult } from './lottery';
import { formatBirthTimeAccuracy, formatGender } from './premiumReport';

export type ConsultationSceneId =
  | 'screenshot-reading'
  | 'premium-chart-report';

export interface ConsultationScene {
  id: ConsultationSceneId;
  title: string;
  shortTitle: string;
  subtitle: string;
  badge: string;
  inputLabel: string;
  placeholder: string;
  starter: string;
  deliverables: string[];
  acceptsScreenshot?: boolean;
}

export interface UserProfile {
  nickname: string;
  occupation: string;
  focus: string;
  goal: string;
  currentDifficulty: string;
  customNote: string;
  currentFocus?: '' | 'career' | 'relationship' | 'health' | 'finance' | 'study';
}

export const EMPTY_USER_PROFILE: UserProfile = {
  nickname: '',
  occupation: '',
  focus: '',
  goal: '',
  currentDifficulty: '',
  customNote: '',
};

export interface GrowthReportInput {
  profile: {
    occupation: string;
    focus: string;
    goal: string;
    currentDifficulty: string;
    additionalContext?: string;
  };
  calendarContext?: {
    label: '传统历法文化背景信息';
    birthDate?: string;
    birthTime?: string;
    calendarType?: LotteryInput['birthCalendar'];
    birthPillars?: string[];
    dayMaster?: string;
    elementCounts?: Partial<Record<ElementName, number>>;
    currentCycle?: string;
  };
}

export const PROFILE_REQUIRED_SCENE_IDS = new Set<ConsultationSceneId>([
  'premium-chart-report',
]);

export function sceneRequiresUserProfile(sceneId: ConsultationSceneId): boolean {
  return PROFILE_REQUIRED_SCENE_IDS.has(sceneId);
}

export function isUserProfileFilled(profile: UserProfile): boolean {
  return Boolean(
    profile.nickname.trim()
      || profile.occupation.trim()
      || profile.customNote.trim(),
  );
}

const growthProfileFields = [
  ['occupation', '职业'],
  ['focus', '关注重点'],
  ['goal', '目标'],
  ['currentDifficulty', '当前困难'],
] as const;

export function getMissingGrowthProfileFields(profile: UserProfile): string[] {
  return growthProfileFields
    .filter(([key]) => !profile[key]?.trim())
    .map(([, label]) => label);
}

export function isGrowthProfileComplete(profile: UserProfile): boolean {
  return getMissingGrowthProfileFields(profile).length === 0;
}

export interface BuildConsultationMessagesOptions {
  sceneId: ConsultationSceneId;
  result: LuckyLotteryResult;
  form: LotteryInput;
  userText: string;
  screenshotText?: string;
  userProfile?: UserProfile;
}

export const consultationScenes: ConsultationScene[] = [
  {
    id: 'premium-chart-report',
    title: '深度命盘报告',
    shortTitle: '深度报告',
    subtitle: '基于命盘数据生成一份涵盖校准、结构、节奏、关系、事业和行动建议的完整报告。',
    badge: '旗舰报告',
    inputLabel: '报告重点',
    placeholder: '例如：重点看事业节奏、关系沟通和未来 30 天行动安排。',
    starter: '请根据当前命盘生成一份深度命盘报告，涵盖今日节奏、关系、事业和行动建议。',
    deliverables: ['校准说明', '结构分析', '时间节奏', '关系洞察', '事业节奏', '行动建议'],
  },
  {
    id: 'screenshot-reading',
    title: '命盘截图解析',
    shortTitle: '看图读盘',
    subtitle: '上传外部排盘截图，AI 提取信息并生成同等质量的深度报告。',
    badge: '截图解析',
    inputLabel: '你想重点看什么',
    placeholder: '例如：这张盘里日主、喜忌和今年节奏分别怎么看？',
    starter: '帮我从这张命盘截图中提取信息，生成一份深度解读报告。',
    deliverables: ['盘面提取', '结构分析', '时间节奏', '行动建议'],
    acceptsScreenshot: true,
  },
];

const commercialGrowthReportScene: ConsultationScene = {
  id: 'premium-chart-report',
  title: '个人成长洞察报告',
  shortTitle: '成长洞察',
  subtitle: '以你主动填写的职业、关注重点、目标和当前困难为主要依据，整理可验证的观察与行动方案。',
  badge: 'AI 报告',
  inputLabel: '补充说明',
  placeholder: '可选：补充你希望报告特别考虑的现实条件。',
  starter: '请结合我的现实背景，整理个人成长洞察与未来 30 天行动建议。',
  deliverables: ['能力倾向', '阶段观察', '事业行动建议', '金钱行动建议', '风险与不确定性提示'],
};

export function getAvailableConsultationScenes(commercialMode: boolean): ConsultationScene[] {
  return commercialMode ? [commercialGrowthReportScene] : consultationScenes;
}

export function buildGrowthReportInput({
  result,
  form,
  userProfile,
}: {
  result?: LuckyLotteryResult | null;
  form: LotteryInput;
  userProfile: UserProfile;
}): GrowthReportInput {
  const additionalContext = userProfile.customNote?.trim() ?? '';
  const calendarContext: GrowthReportInput['calendarContext'] = {
    label: '传统历法文化背景信息',
  };

  if (form.birthDate) calendarContext.birthDate = form.birthDate;
  if (form.birthTime) calendarContext.birthTime = form.birthTime;
  if (form.birthDate || form.birthTime) calendarContext.calendarType = form.birthCalendar;
  if (result) {
    calendarContext.birthPillars = result.profile.birth.pillars.map((pillar) => pillar.label);
    calendarContext.dayMaster = `${result.profile.dayMaster.stem}${result.profile.dayMaster.element}`;
    calendarContext.elementCounts = result.profile.birth.elementCounts;
    if (result.profile.daYun?.currentGanZhi) calendarContext.currentCycle = result.profile.daYun.currentGanZhi;
  }

  return {
    profile: {
      occupation: userProfile.occupation?.trim() ?? '',
      focus: userProfile.focus?.trim() ?? '',
      goal: userProfile.goal?.trim() ?? '',
      currentDifficulty: userProfile.currentDifficulty?.trim() ?? '',
      ...(additionalContext ? { additionalContext } : {}),
    },
    ...(Object.keys(calendarContext).length > 1 ? { calendarContext } : {}),
  };
}

// ─── 每个场景的专属系统提示词 ───

const CORE_REPORT_PROMPT = [
  '## 角色',
  '你是一位收费 200 元/次的命理分析师，客户付了钱，你的交付必须让他觉得物超所值。',
  '报告要有结构、有细节、有"只属于他"的分析，不能像免费测算网站的通用输出。',
  '',
  '## 输出结构（严格按此顺序，每部分用 markdown 标题）',
  '',
  '### 一、基础盘校准',
  '确认四柱是否准确、真太阳时是否影响时柱、时辰准确度对解读的影响。',
  '引用纳音数据（如"日柱纳音为XX，先天底色偏向……"）。',
  '如果出生时间为"大概"或"不确定"，说明哪些结论会因此降低确信度。',
  '',
  '### 二、命盘结构——你是谁',
  '基于十神分布和藏干脉络，把日主强弱翻译成行为特征。',
  '用"你在工作中倾向于……""你和人相处时容易……"这样的句式。',
  '引用十二长生数据说明日主状态（如"日主处于X位，意味着……"）。',
  '不要罗列十神表格，要翻译成生活语言。',
  '',
  '### 三、高级参考',
  '解读命宫身宫的含义（如"命宫XX说明你的人生主轴偏向……"）。',
  '说明空亡对哪些宫位的影响。',
  '引用当日吉神凶煞做简要参考。',
  '本节内容标注"仅供参考，建议结合实际体验校验"。',
  '',
  '### 四、时间节奏——你在哪个阶段',
  '引用大运数据，说明当前所在大运的主题和能量特征。',
  '结合流年、流月、流日，描述用户"当前处于什么阶段"。',
  '用蓄力期/推进期/收尾期这样的阶段语言，而非术语堆砌。',
  '简要展望下一步大运的转变方向。',
  '',
  '### 五、今日节奏与行动建议',
  '先用一句话概括今天的整体基调（适合主动还是观望）。',
  '然后分领域给出具体行动建议：',
  '- **事业**：当前工作节奏判断 + 本周优先事项 + 沟通策略，2-3 条。',
  '- **关系**：当前互动能量状态 + 沟通窗口 + 一个可以试着做的小动作，2-3 条。',
  '- **健康/财务**：简要提醒，1-2 条。',
  '- **今天最该避开的一件事**：单独拎出来，加重语气。',
  '要具体到"本周适合做什么、下周适合做什么"。',
  '如果有数据不足无法判断的领域，诚实说明并建议咨询专业人士。',
  '',
  '## 风格要求',
  '- 报告感，不是聊天感。像在交付一份文档，不像在微信群里回消息。',
  '- 每段不超过 5 句，宁可分小段也不堆长段落。',
  '- 禁止出现"让我们来看看""首先我们注意到"等口水开头。直接进入分析。',
  '- 引用数据时自然融入分析，不要单独列一行原始数据。',
  '- 如果用户有职业信息，建议要贴合他的职业场景。',
  '- 关系部分绝对禁止：断言对方想法、建议分手/离婚、暗示第三者、使用宿命论表达。',
].join('\n');

const SCENE_SYSTEM_PROMPTS: Record<ConsultationSceneId, string> = {
  'premium-chart-report': [
    CORE_REPORT_PROMPT,
    '',
    '## 数据说明',
    '系统已为你精确计算了十神、藏干、纳音、十二长生、命宫身宫、空亡和大运数据，请直接引用这些数据进行分析，不要重新计算。',
  ].join('\n'),

  'screenshot-reading': [
    CORE_REPORT_PROMPT,
    '',
    '## 截图模式补充说明',
    '用户上传了一张命盘截图，请先从截图中提取关键信息（四柱、五行、十神、大运等），然后按照上述报告结构输出。',
    '如果截图中某些信息不完整或无法识别，在对应章节标注"截图中未包含此信息"，不要编造。',
    '系统同时提供了用户已录入的命盘数据作为交叉参考，截图信息与系统数据不一致时以截图为主。',
  ].join('\n'),
};

const sceneMap = new Map(consultationScenes.map((scene) => [scene.id, scene]));

export function isChartComplete(form: LotteryInput): boolean {
  return Boolean(form.birthDate && form.birthTime);
}

export function getChartMissingHint(form: LotteryInput): string {
  const missing: string[] = [];
  if (!form.birthDate) missing.push('出生日期');
  if (!form.birthTime) missing.push('出生时间');
  return missing.length > 0 ? `请先填写${missing.join('和')}` : '';
}

export function buildConsultationMessages({
  sceneId,
  result,
  form,
  userText,
  screenshotText,
  userProfile,
}: BuildConsultationMessagesOptions): DeepSeekMessage[] {
  const scene = sceneMap.get(sceneId) ?? consultationScenes[0];
  const cleanUserText = userText.trim() || scene.starter;
  const cleanScreenshotText = screenshotText?.trim();

  return [
    {
      role: 'system',
      content: buildSystemPrompt(scene, userProfile, form.birthDate),
    },
    {
      role: 'user',
      content: buildUserMessage(scene, result, form, cleanUserText, cleanScreenshotText),
    },
  ];
}

function buildSystemPrompt(scene: ConsultationScene, userProfile: UserProfile | undefined, birthDate: string): string {
  const base = [
    '你是一位以传统历法、四柱和五行取象为语言的文化解读顾问。',
    '你的输出用于自我观察、行动整理和情绪梳理，不替用户做医疗、法律、投资等专业决定。',
    '若涉及高风险事项，请建议用户咨询对应领域的专业人士。',
  ].join('\n');

  const scenePrompt = SCENE_SYSTEM_PROMPTS[scene.id];
  const profileContext = buildUserProfileContext(userProfile, birthDate);

  return [base, '', scenePrompt, profileContext].filter(Boolean).join('\n');
}

function buildUserProfileContext(profile: UserProfile | undefined, birthDate: string): string {
  const parts: string[] = [];
  const age = calcAge(birthDate);

  if (age > 0) parts.push(`年龄：${age} 岁`);

  if (profile) {
    const name = profile.nickname.trim();
    const job = profile.occupation.trim();
    const note = profile.customNote.trim();

    if (name) parts.push(`称呼：${name}`);
    if (job) parts.push(`职业：${job}`);
    if (note) parts.push(`补充说明：${note}`);
  }

  if (parts.length === 0) return '';

  return [
    '',
    '## 用户背景',
    '以下信息来自用户自主填写，请据此调整建议的具体程度和语言风格：',
    ...parts,
  ].join('\n');
}

function calcAge(birthDate: string): number {
  if (!birthDate) return 0;

  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return 0;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age > 0 ? age : 0;
}

function buildUserMessage(
  scene: ConsultationScene,
  result: LuckyLotteryResult,
  form: LotteryInput,
  userText: string,
  screenshotText?: string,
): string {
  return [
    `咨询场景：${scene.title}`,
    '',
    '当前命盘上下文：',
    buildChartContext(result, form),
    screenshotText ? `\n截图文字信息：\n${screenshotText}` : '',
    `\n用户问题：${userText}`,
  ].filter(Boolean).join('\n');
}

function buildChartContext(result: LuckyLotteryResult, form: LotteryInput): string {
  const profile = result.profile;
  const fortune = result.dailyFortune;

  // 基础信息 — 所有场景都需要
  const base = [
    `生日输入：${form.birthDate} ${form.birthTime}（${form.birthCalendar === 'lunar' ? '农历' : '阳历'}）`,
    `性别：${formatGender(form.gender)}`,
    `出生地：${form.birthPlace?.trim() || '未填写'}`,
    `真太阳时：${form.useTrueSolarTime ? '已开启' : '未启用'}`,
    `出生时间准确度：${formatBirthTimeAccuracy(form.birthTimeAccuracy)}`,
    `生日换算：阳历 ${profile.birthInfo.solarDate}，农历 ${profile.birthInfo.lunarDateText}`,
    `查看日期：${form.targetDate}，农历 ${profile.targetInfo.lunarDateText}`,
    `本命四柱：${formatPillars(profile.birth.pillars)}`,
    `流日三柱：${formatPillars(profile.transit.pillars)}`,
    `日主：${profile.dayMaster.stem}${profile.dayMaster.element}`,
  ];

  // 五行分布
  base.push(`命盘五行：${formatElementCounts(profile.birth.elementCounts)}`);
  base.push(`今日五行：${formatElementCounts(profile.transit.elementCounts)}`);

  // 高级命理数据
  if (profile.advanced) {
    base.push(...formatAdvancedData(profile.advanced));
  }

  // 大运数据
  if (profile.daYun) {
    base.push(...formatDaYunData(profile.daYun));
  }

  // 今日运势
  base.push(`今日吉凶：${fortune.label}（${fortune.score}）`);
  base.push(`今日适合：${fortune.suitable.join('、') || '保持日常节奏'}`);
  base.push(`今日放缓：${fortune.avoid.join('、') || '少做临时变更'}`);
  base.push(`个人重点：${fortune.personalFocus}`);

  // 灵感数字
  base.push(`灵感数字：${result.reds.map((ball) => ball.value).join('、')} / ${result.blue.value}`);

  return base.join('\n');
}

function formatAdvancedData(adv: AdvancedBaziData): string[] {
  const ss = adv.shiShen;
  const lines: string[] = [];

  lines.push(`十神（天干）：年${ss.year.gan}，月${ss.month.gan}，日${ss.day.gan}，时${ss.hour.gan}`);
  lines.push(`十神（藏干）：年支[${ss.year.zhiHidden.join('、')}]，月支[${ss.month.zhiHidden.join('、')}]，日支[${ss.day.zhiHidden.join('、')}]，时支[${ss.hour.zhiHidden.join('、')}]`);

  const hg = adv.hideGan;
  lines.push(`藏干：年支[${hg.year.join('、')}]，月支[${hg.month.join('、')}]，日支[${hg.day.join('、')}]，时支[${hg.hour.join('、')}]`);

  const ny = adv.naYin;
  lines.push(`纳音：年[${ny.year}]，月[${ny.month}]，日[${ny.day}]，时[${ny.hour}]`);

  const ds = adv.diShi;
  lines.push(`十二长生：年[${ds.year}]，月[${ds.month}]，日[${ds.day}]，时[${ds.hour}]`);

  const p = adv.palaces;
  lines.push(`命宫：${p.ming}（${p.mingNaYin}），身宫：${p.shen}（${p.shenNaYin}）`);

  const kw = adv.kongWang;
  lines.push(`空亡：日柱[${kw.day}]，时柱[${kw.time}]`);

  return lines;
}

function formatDaYunData(daYun: DaYunData): string[] {
  const direction = daYun.forward ? '顺行' : '逆行';
  const itemsText = daYun.items
    .map((item) => `${item.startAge}-${item.endAge}岁 ${item.ganZhi}`)
    .join(' / ');
  const current = daYun.currentGanZhi ? `当前大运：${daYun.currentGanZhi}` : '';

  return [
    `大运（${direction}）：${itemsText}`,
    current,
  ].filter(Boolean);
}

function formatPillars(pillars: LuckyLotteryResult['profile']['birth']['pillars']): string {
  return pillars.map((pillar) => `${pillar.label}${pillar.element}`).join('、');
}

function formatElementCounts(counts: Record<ElementName, number>): string {
  return Object.entries(counts)
    .map(([element, count]) => `${element}${count}`)
    .join('、');
}
