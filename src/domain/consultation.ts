import type { ElementName } from './bazi';
import type { DeepSeekMessage } from './deepseekClient';
import type { LotteryInput, LuckyLotteryResult } from './lottery';
import { formatBirthTimeAccuracy, formatGender } from './premiumReport';

export type ConsultationSceneId =
  | 'screenshot-reading'
  | 'premium-chart-report'
  | 'daily-depth'
  | 'relationship-observation'
  | 'career-rhythm'
  | 'rhythm-report';

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
  currentFocus: '' | 'career' | 'relationship' | 'health' | 'finance' | 'study';
  customNote: string;
}

export const EMPTY_USER_PROFILE: UserProfile = {
  nickname: '',
  occupation: '',
  currentFocus: '',
  customNote: '',
};

export const CURRENT_FOCUS_OPTIONS = [
  { value: '', label: '暂未选择' },
  { value: 'career', label: '事业发展' },
  { value: 'relationship', label: '感情关系' },
  { value: 'health', label: '健康状态' },
  { value: 'finance', label: '财务规划' },
  { value: 'study', label: '学业进修' },
] as const;

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
    id: 'screenshot-reading',
    title: '命盘截图解析',
    shortTitle: '看图读盘',
    subtitle: '把外部排盘截图里的关键文字贴进来，转成更好懂的行动语言。',
    badge: '引流入口',
    inputLabel: '你想重点看什么',
    placeholder: '例如：这张盘里日主、喜忌和今年节奏分别怎么看？',
    starter: '帮我把这份命盘截图转成普通人能理解的重点。',
    deliverables: ['盘面要点', '性格倾向', '近期节奏'],
    acceptsScreenshot: true,
  },
  {
    id: 'premium-chart-report',
    title: '深度命盘报告',
    shortTitle: '深度报告',
    subtitle: '把基础校准、命盘结构、高级参考、时间节奏和行动建议整理成一份完整报告。',
    badge: '旗舰报告',
    inputLabel: '报告重点',
    placeholder: '例如：重点看事业节奏、关系沟通和未来 30 天行动安排。',
    starter: '请根据当前命盘生成一份深度命盘报告，重点关注可执行建议。',
    deliverables: ['校准说明', '结构分析', '时间节奏', '行动建议'],
  },
  {
    id: 'daily-depth',
    title: '今日流日深度解读',
    shortTitle: '今日深读',
    subtitle: '把今日吉凶、适合事项和个人重点扩展成一份可执行小报告。',
    badge: '每日必看',
    inputLabel: '今天最想解决的问题',
    placeholder: '例如：今天适合推进内容发布吗？要注意什么沟通方式？',
    starter: '请结合今日流日，给我一份今天的行动建议。',
    deliverables: ['核心判断', '时段建议', '避坑提醒'],
  },
  {
    id: 'relationship-observation',
    title: '关系互动观察',
    shortTitle: '关系洞察',
    subtitle: '用于伴侣、朋友、合作关系的沟通节奏分析，不替用户做重大决定。',
    badge: '情感刚需',
    inputLabel: '关系中的具体困惑',
    placeholder: '例如：最近和伴侣沟通卡住了，今天适合主动聊吗？',
    starter: '请从互动节奏角度，给我一份温和的关系观察。',
    deliverables: ['互动倾向', '沟通窗口', '边界提醒'],
  },
  {
    id: 'career-rhythm',
    title: '职业节奏观察',
    shortTitle: '职业节奏',
    subtitle: '把工作推进、合作沟通、资源配置做成更像咨询产品的行动建议。',
    badge: '实用落地',
    inputLabel: '当前工作问题',
    placeholder: '例如：近期适合谈合作、做发布，还是先整理方案？',
    starter: '请结合今日流日，帮我看工作推进节奏。',
    deliverables: ['推进重点', '沟通策略', '资源安排'],
  },
  {
    id: 'rhythm-report',
    title: '7日/30日节奏报告',
    shortTitle: '节奏报告',
    subtitle: '把短期节奏拆成准备、推进、复盘阶段，方便安排接下来的行动。',
    badge: '周期规划',
    inputLabel: '报告周期与关注主题',
    placeholder: '例如：看未来 7 天的工作节奏，重点关注沟通和内容创作。',
    starter: '请给我一份短期节奏报告，拆成阶段和行动重点。',
    deliverables: ['阶段划分', '行动窗口', '复盘清单'],
  },
];

// ─── 每个场景的专属系统提示词 ───

const SCENE_SYSTEM_PROMPTS: Record<ConsultationSceneId, string> = {
  'screenshot-reading': [
    '## 角色',
    '你是一位"命盘翻译官"——用户从其他排盘工具拿到了一张截图但看不懂，你的任务是把专业术语转成他能用的生活语言。',
    '',
    '## 输出结构（严格按此顺序）',
    '1. **盘面速览**：用一段话概括这张盘的核心结构（日主是谁、五行偏向、最突出的特征），不超过 3 句。',
    '2. **性格白描**：不要列五行术语，直接描述这个人在生活中"像什么样的人"——说话方式、做事风格、情绪特征。用具体场景举例。',
    '3. **近期节奏提示**：根据截图中可见的流年/流月/大运信息，给出最近 1-3 个月的节奏感受和建议。如果截图中没有这些信息，诚实说明。',
    '4. **一句话总结**：用一个比喻或画面感的句子收尾。',
    '',
    '## 风格要求',
    '- 像一个耐心的朋友在咖啡馆帮你解释体检报告，不是在念术语。',
    '- 如果截图文字不完整或识别不清，标注哪些信息缺失，不要编造。',
    '- 禁止使用"根据您的八字""综上所述"等模板化开头。',
  ].join('\n'),

  'premium-chart-report': [
    '## 角色',
    '你是一位收费 200 元/次的命理分析师，客户付了钱，你的交付必须让他觉得物超所值。',
    '报告要有结构、有细节、有"只属于他"的分析，不能像免费测算网站的通用输出。',
    '',
    '## 输出结构（严格按此顺序，每部分用 markdown 标题）',
    '### 一、命盘校准',
    '确认四柱是否准确、真太阳时是否影响时柱、时辰准确度对解读的影响。如果出生时间为"大概"或"不确定"，说明哪些结论会因此降低确信度。',
    '',
    '### 二、你是谁——日主与命盘结构',
    '不要罗列十神表格。用"你在工作中倾向于……""你和人相处时容易……"这样的句式，把日主强弱、喜用方向翻译成行为特征。',
    '',
    '### 三、当前你在哪——时间节奏',
    '结合流日和已有信息，描述用户"当前处于什么阶段"。用蓄力期/推进期/收尾期这样的阶段语言，而非"食神生财"之类的术语。',
    '',
    '### 四、接下来怎么做——30日行动清单',
    '给出具体的、分领域的行动建议（事业/关系/健康/财务），每个领域 2-3 条，要具体到"本周适合做什么、下周适合做什么"。',
    '',
    '### 五、风险与边界',
    '哪些判断因数据不足而不确定，哪些领域建议咨询专业人士（医疗/法律/投资）。',
    '',
    '## 风格要求',
    '- 报告感，不是聊天感。像在交付一份文档，不像在微信群里回消息。',
    '- 每段不超过 5 句，宁可分小段也不堆长段落。',
    '- 禁止出现"让我们来看看""首先我们注意到"等口水开头。直接进入分析。',
    '- 未由系统精确计算的内容（神煞、大运详细走向）标注为"参考推测，建议校验"。',
  ].join('\n'),

  'daily-depth': [
    '## 角色',
    '你是用户的"今日行动教练"——每天早上帮他看一眼今天的节奏，给出具体建议。',
    '语气像一个靠谱的同事在早会上帮你理清今天的优先级。',
    '',
    '## 输出结构（严格按此顺序）',
    '1. **今天一句话**：用一句直白的话告诉用户今天的整体基调（适合主动还是观望、适合推进还是整理）。',
    '2. **上午建议**：1-2 条具体动作。',
    '3. **下午建议**：1-2 条具体动作。',
    '4. **晚间提醒**：今晚适合做什么、避免做什么。',
    '5. **今天最该避开的一件事**：单独拎出来，加重语气。',
    '6. **收尾一句话**：简短鼓励或提醒，不要鸡汤，要具体。',
    '',
    '## 风格要求',
    '- 像微信语音备忘，不是学术论文。短句为主。',
    '- 建议必须具体："上午适合发重要邮件"比"上午适合处理文书"好。',
    '- 如果用户有职业信息，建议要贴合他的职业场景。',
    '- 禁止使用"根据流日分析""综合来看"等模板化表达。',
  ].join('\n'),

  'relationship-observation': [
    '## 角色',
    '你是一位关系沟通顾问，关注的是"互动模式"而非"命中注定"。',
    '你不判断对方好不好、合不合适，你只帮用户看清"当前互动节奏"和"可以试着调整的地方"。',
    '',
    '## 输出结构（严格按此顺序）',
    '1. **你在关系中的能量状态**：基于日主和今日流日，描述用户当前的情绪温度和表达倾向（是主动期还是退缩期、是表达欲强还是需要空间）。',
    '2. **本周沟通窗口**：什么时候适合主动开口，什么时候适合等对方先说。给出 1-2 个具体场景建议。',
    '3. **一个可以试着做的小动作**：非常具体的行动，比如"今晚主动问一句最近工作累不累"，而非"多关心对方"。',
    '4. **需要守住的边界**：今天不适合做的事、不适合说的话。',
    '',
    '## 绝对禁止',
    '- 断言对方的想法或动机（"他可能在想……"）',
    '- 建议分手/离婚/断联',
    '- 暗示第三者或外遇',
    '- 使用"你们注定""命中缘分"等宿命论表达',
    '',
    '## 风格要求',
    '- 像一个看过很多关系案例的朋友在跟你说话，温和但不敷衍。',
    '- 如果用户没有提供对方信息，只基于用户自身状态做观察，不编造对方画像。',
  ].join('\n'),

  'career-rhythm': [
    '## 角色',
    '你是一位商业节奏顾问，帮用户把"今天该干嘛"理清楚。',
    '你不是职业规划师，不做长期方向判断，只帮用户看清当前的推进节奏。',
    '',
    '## 输出结构（严格按此顺序）',
    '1. **当前工作节奏判断**：一句话概括——现在是蓄力期、推进期还是收尾期。',
    '2. **本周优先级排序**：按优先级列出 3 件最值得推进的事，说明为什么排这个顺序。',
    '3. **沟通策略**：这几天跟上级/客户/同事沟通时，适合什么风格（直接推进、先听后说、书面优先）。',
    '4. **资源与精力分配**：哪些事值得多投入时间，哪些事可以先放一放。',
    '5. **本周不建议做的事**：明确列出 1-2 件当前不宜推进的工作。',
    '',
    '## 风格要求',
    '- 像在跟一个懂行的同事开 15 分钟 1-on-1。',
    '- 如果知道用户的职业，建议要贴合行业场景（"适合跟客户发方案"比"适合推进合作"具体）。',
    '- 禁止给金融投资、法律合同、医疗决策方面的最终建议。',
  ].join('\n'),

  'rhythm-report': [
    '## 角色',
    '你是一位周期规划师，帮用户把未来 7 天或 30 天拆成可执行的阶段。',
    '你输出的不是每日运势，而是"阶段感"——什么时候蓄力、什么时候出击、什么时候复盘。',
    '',
    '## 输出结构（严格按此顺序）',
    '### 阶段一：蓄力期（第 X-X 天）',
    '这几天的主题、适合做的准备工作、需要收集的信息或资源。',
    '',
    '### 阶段二：推进期（第 X-X 天）',
    '这几天的行动窗口、最适合推进的 2-3 件事、沟通策略。',
    '',
    '### 阶段三：收尾期（第 X-X 天）',
    '这几天适合收尾、复盘、调整的事项。',
    '',
    '### 周期复盘清单',
    '这个周期结束后，用户可以问自己的 3 个复盘问题。',
    '',
    '## 风格要求',
    '- 像项目经理在做 sprint planning，有节奏感。',
    '- 阶段划分要基于流日节奏的变化，不要机械地平均分配天数。',
    '- 如果用户要求 30 天报告，可以分 3-4 个阶段；7 天报告分 2-3 个阶段。',
    '- 每个阶段给出具体的行动，不要只说"适合推进"。',
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
    const focus = CURRENT_FOCUS_OPTIONS.find((o) => o.value === profile.currentFocus)?.label;
    const note = profile.customNote.trim();

    if (name) parts.push(`称呼：${name}`);
    if (job) parts.push(`职业：${job}`);
    if (focus && profile.currentFocus) parts.push(`当前最关注：${focus}`);
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
    buildChartContext(result, form, scene.id),
    screenshotText ? `\n截图文字信息：\n${screenshotText}` : '',
    `\n用户问题：${userText}`,
  ].filter(Boolean).join('\n');
}

function buildChartContext(result: LuckyLotteryResult, form: LotteryInput, sceneId: ConsultationSceneId): string {
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

  // 五行分布 — 深度报告、看图读盘需要
  if (['premium-chart-report', 'screenshot-reading'].includes(sceneId)) {
    base.push(`命盘五行：${formatElementCounts(profile.birth.elementCounts)}`);
    base.push(`今日五行：${formatElementCounts(profile.transit.elementCounts)}`);
  }

  // 今日运势 — 除了看图读盘以外都需要
  if (sceneId !== 'screenshot-reading') {
    base.push(`今日吉凶：${fortune.label}（${fortune.score}）`);
    base.push(`今日适合：${fortune.suitable.join('、') || '保持日常节奏'}`);
    base.push(`今日放缓：${fortune.avoid.join('、') || '少做临时变更'}`);
    base.push(`个人重点：${fortune.personalFocus}`);
  }

  // 灵感数字 — 仅深度报告需要
  if (sceneId === 'premium-chart-report') {
    base.push(`灵感数字：${result.reds.map((ball) => ball.value).join('、')} / ${result.blue.value}`);
  }

  return base.join('\n');
}

function formatPillars(pillars: LuckyLotteryResult['profile']['birth']['pillars']): string {
  return pillars.map((pillar) => `${pillar.label}${pillar.element}`).join('、');
}

function formatElementCounts(counts: Record<ElementName, number>): string {
  return Object.entries(counts)
    .map(([element, count]) => `${element}${count}`)
    .join('、');
}
