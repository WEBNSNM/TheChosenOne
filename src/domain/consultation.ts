import type { ElementName } from './bazi';
import type { DeepSeekMessage } from './deepseekClient';
import type { LotteryInput, LuckyLotteryResult } from './lottery';
import { formatBirthTimeAccuracy, formatGender } from './premiumReport';

export type ConsultationSceneId =
  | 'premium-chart-report'
  | 'screenshot-reading'
  | 'daily-depth'
  | 'rhythm-report'
  | 'element-personality'
  | 'relationship-observation'
  | 'career-rhythm'
  | 'follow-up-chat'
  | 'learning-coach';

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
  promptFocus: string;
  acceptsScreenshot?: boolean;
}

export interface BuildConsultationMessagesOptions {
  sceneId: ConsultationSceneId;
  result: LuckyLotteryResult;
  form: LotteryInput;
  userText: string;
  screenshotText?: string;
}

export const consultationScenes: ConsultationScene[] = [
  {
    id: 'premium-chart-report',
    title: '深度命盘报告',
    shortTitle: '深度报告',
    subtitle: '把基础校准、命盘结构、高级参考、时间节奏和行动建议整理成一份完整报告。',
    badge: '付费报告',
    inputLabel: '报告重点',
    placeholder: '例如：重点看事业节奏、关系沟通和未来 30 天行动安排。',
    starter: '请根据当前命盘生成一份深度命盘报告，重点关注可执行建议。',
    deliverables: ['校准说明', '结构分析', '时间节奏', '行动建议'],
    promptFocus: '输出报告式解读，覆盖基础盘校准、命盘结构、高级参考、时间节奏和行动建议；未由系统精确计算的神煞、命宫身宫、大运等内容只能作为待校验参考，不要编造确定结论。',
  },
  {
    id: 'screenshot-reading',
    title: '命盘截图解析',
    shortTitle: '看图读盘',
    subtitle: '把外部排盘图里的关键文字贴进来，转成更好懂的行动语言。',
    badge: '进阶解读',
    inputLabel: '你想重点看什么',
    placeholder: '例如：这张盘里日主、喜忌和今年节奏分别怎么看？',
    starter: '帮我把这份命盘截图转成普通人能理解的重点。',
    deliverables: ['盘面要点', '性格倾向', '近期节奏'],
    promptFocus: '先校对截图文字中的四柱、大运、流年信息，再用通俗语言提炼盘面结构与近期节奏。',
    acceptsScreenshot: true,
  },
  {
    id: 'daily-depth',
    title: '今日流日深度解读',
    shortTitle: '今日深读',
    subtitle: '把今日吉凶、适合事项和个人重点扩展成一份可执行小报告。',
    badge: '今日重点',
    inputLabel: '今天最想解决的问题',
    placeholder: '例如：今天适合推进内容发布吗？要注意什么沟通方式？',
    starter: '请结合今日流日，给我一份今天的行动建议。',
    deliverables: ['核心判断', '适合事项', '避坑提醒'],
    promptFocus: '围绕今日流日、黄黑道、宜忌和日主关系，输出当天可执行建议。',
  },
  {
    id: 'rhythm-report',
    title: '7日/30日节奏报告',
    shortTitle: '节奏报告',
    subtitle: '把短期节奏拆成准备、推进、复盘阶段，方便安排接下来的行动。',
    badge: '周期节奏',
    inputLabel: '报告周期与关注主题',
    placeholder: '例如：看未来 7 天的工作节奏，重点关注沟通和内容创作。',
    starter: '请给我一份短期节奏报告，拆成阶段和行动重点。',
    deliverables: ['阶段划分', '行动窗口', '复盘清单'],
    promptFocus: '基于当前命盘与目标日期，生成短周期节奏报告，强调阶段感与可执行清单。',
  },
  {
    id: 'element-personality',
    title: '命盘五行性格解读',
    shortTitle: '五行画像',
    subtitle: '把五行强弱、日主和表达方式转成更容易理解的自我画像。',
    badge: '自我画像',
    inputLabel: '想深入看的性格面向',
    placeholder: '例如：我在表达、执行和情绪恢复上有什么倾向？',
    starter: '请根据命盘五行给我一份性格与优势解读。',
    deliverables: ['优势画像', '消耗来源', '成长建议'],
    promptFocus: '围绕五行分布、日主元素和本命四柱，输出温和、具体、可共鸣的自我观察。',
  },
  {
    id: 'relationship-observation',
    title: '关系互动观察',
    shortTitle: '关系互动',
    subtitle: '用于伴侣、朋友、合作关系的沟通节奏分析，不替用户做重大决定。',
    badge: '关系沟通',
    inputLabel: '关系中的具体困惑',
    placeholder: '例如：最近和合作伙伴沟通卡住了，今天适合主动聊吗？',
    starter: '请从互动节奏角度，给我一份温和的关系观察。',
    deliverables: ['互动倾向', '沟通方式', '边界提醒'],
    promptFocus: '只做沟通节奏与情绪边界观察，避免断言对方动机，避免替用户做决定。',
  },
  {
    id: 'career-rhythm',
    title: '职业节奏观察',
    shortTitle: '职业节奏',
    subtitle: '把工作推进、合作沟通、资源配置做成更像咨询产品的行动建议。',
    badge: '工作规划',
    inputLabel: '当前工作问题',
    placeholder: '例如：近期适合谈合作、做发布，还是先整理方案？',
    starter: '请结合今日流日，帮我看工作推进节奏。',
    deliverables: ['推进重点', '沟通策略', '资源安排'],
    promptFocus: '聚焦职业节奏、表达方式和资源安排，不给金融、合同、法律性质的最终建议。',
  },
  {
    id: 'follow-up-chat',
    title: 'AI 连续追问',
    shortTitle: '连续追问',
    subtitle: '围绕同一命盘做多轮细化，把一个问题追问到更具体、更可执行。',
    badge: '连续追问',
    inputLabel: '这一轮想追问什么',
    placeholder: '例如：上一段建议里，哪些动作适合今天做，哪些可以延后？',
    starter: '请像咨询师一样，先回答我的问题，再给我一个可继续追问的方向。',
    deliverables: ['直接回答', '细化建议', '下一问引导'],
    promptFocus: '用咨询式追问帮助用户拆问题，回答后给出下一步可追问方向。',
  },
  {
    id: 'learning-coach',
    title: '命理学习辅导',
    shortTitle: '学习辅导',
    subtitle: '面向想学排盘逻辑的用户，用当前盘面把术语讲清楚。',
    badge: '学习讲解',
    inputLabel: '想学习的概念',
    placeholder: '例如：日主、财星、官杀和流日到底怎么联系？',
    starter: '请用我的命盘举例，讲清楚一个命理概念。',
    deliverables: ['概念解释', '盘面例子', '练习问题'],
    promptFocus: '以教学为主，用当前盘面举例说明概念，避免神秘化和绝对化表达。',
  },
];

const sceneMap = new Map(consultationScenes.map((scene) => [scene.id, scene]));

export function buildConsultationMessages({
  sceneId,
  result,
  form,
  userText,
  screenshotText,
}: BuildConsultationMessagesOptions): DeepSeekMessage[] {
  const scene = sceneMap.get(sceneId) ?? consultationScenes[0];
  const cleanUserText = userText.trim() || scene.starter;
  const cleanScreenshotText = screenshotText?.trim();

  return [
    {
      role: 'system',
      content: [
        '你是一位以传统历法、四柱和五行取象为语言的文化解读顾问。',
        '你的输出用于自我观察、行动整理和情绪梳理，不替用户做医疗、法律、投资等专业决定。',
        '保持温和、克制、具体，避免恐吓式、绝对化、保证结果或制造依赖的表达。',
        '若涉及高风险事项，请建议用户咨询对应领域的专业人士。',
      ].join('\n'),
    },
    {
      role: 'user',
      content: [
        `咨询场景：${scene.title}`,
        `场景目标：${scene.promptFocus}`,
        '',
        '当前命盘上下文：',
        buildChartContext(result, form),
        cleanScreenshotText ? `\n截图文字信息：\n${cleanScreenshotText}` : '',
        `\n用户问题：${cleanUserText}`,
        '',
        '请用中文输出，结构包含：核心判断、可执行建议、需要放缓的事项、温和提醒。每段不超过 4 句，语言要像真实咨询，不要像机械模板。',
      ].filter(Boolean).join('\n'),
    },
  ];
}

function buildChartContext(result: LuckyLotteryResult, form: LotteryInput): string {
  const profile = result.profile;
  const fortune = result.dailyFortune;

  return [
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
    `命盘五行：${formatElementCounts(profile.birth.elementCounts)}`,
    `今日五行：${formatElementCounts(profile.transit.elementCounts)}`,
    `今日吉凶：${fortune.label}（${fortune.score}）`,
    `今日适合：${fortune.suitable.join('、') || '保持日常节奏'}`,
    `今日放缓：${fortune.avoid.join('、') || '少做临时变更'}`,
    `个人重点：${fortune.personalFocus}`,
    `灵感数字：${result.reds.map((ball) => ball.value).join('、')} / ${result.blue.value}`,
  ].join('\n');
}

function formatPillars(pillars: LuckyLotteryResult['profile']['birth']['pillars']): string {
  return pillars.map((pillar) => `${pillar.label}${pillar.element}`).join('、');
}

function formatElementCounts(counts: Record<ElementName, number>): string {
  return Object.entries(counts)
    .map(([element, count]) => `${element}${count}`)
    .join('、');
}
