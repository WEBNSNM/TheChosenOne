import { ELEMENTS, type ElementName } from './bazi';
import type { LuckyLotteryResult } from './lottery';

export interface SharePosterElementRow {
  element: ElementName;
  count: number;
  ratio: number;
  color: string;
}

export type SharePosterTemplateId = 'mystic' | 'focus' | 'soft';

export interface SharePosterTemplate {
  id: SharePosterTemplateId;
  name: string;
  description: string;
}

export interface SharePosterModel {
  width: number;
  height: number;
  template: SharePosterTemplate;
  brand: string;
  kicker: string;
  title: string;
  subtitle: string;
  dateLine: string;
  fortuneLabel: string;
  score: number;
  summary: string;
  personalFocus: string;
  suitable: string[];
  avoid: string[];
  elementRows: SharePosterElementRow[];
  redNumbers: string[];
  blueNumber: string;
  qrTitle: string;
  qrCaption: string;
  footer: string;
}

const POSTER_WIDTH = 1080;
const POSTER_HEIGHT = 1920;
export const SHARE_POSTER_TEMPLATES: SharePosterTemplate[] = [
  {
    id: 'mystic',
    name: '星盘感',
    description: '氛围最强，适合做朋友圈第一眼吸引。',
  },
  {
    id: 'focus',
    name: '号码主视觉',
    description: '红蓝灵感更醒目，适合直接保存转发。',
  },
  {
    id: 'soft',
    name: '今日便签',
    description: '更像私人提醒，适合分享给朋友。',
  },
];
const ELEMENT_COLORS: Record<ElementName, string> = {
  木: '#4fd6bd',
  火: '#e94f5f',
  土: '#f6c866',
  金: '#e7edf8',
  水: '#4f8cff',
};

export function createSharePosterModel(
  result: LuckyLotteryResult,
  targetDate: string,
  templateId: SharePosterTemplateId = 'mystic',
): SharePosterModel {
  const counts = result.profile.birth.elementCounts;
  const maxCount = Math.max(1, ...Object.values(counts));
  const template = getPosterTemplate(templateId);
  const copy = getTemplateCopy(template.id);

  return {
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
    template,
    brand: 'The Chosen One',
    kicker: copy.kicker,
    title: copy.title,
    subtitle: `${result.profile.transit.day.label}流日 · ${result.dailyFortune.label}`,
    dateLine: `${targetDate} · 农历${result.profile.targetInfo.lunarDateText}`,
    fortuneLabel: result.dailyFortune.label,
    score: result.dailyFortune.score,
    summary: result.dailyFortune.summary,
    personalFocus: result.dailyFortune.personalFocus,
    suitable: result.dailyFortune.suitable.slice(0, 6),
    avoid: result.dailyFortune.avoid.slice(0, 4),
    elementRows: ELEMENTS.map((element) => ({
      element,
      count: counts[element],
      ratio: counts[element] / maxCount,
      color: ELEMENT_COLORS[element],
    })),
    redNumbers: result.reds.map((ball) => formatNumber(ball.value)),
    blueNumber: formatNumber(result.blue.value),
    qrTitle: copy.qrTitle,
    qrCaption: copy.qrCaption,
    footer: '仅供娱乐与自我观察参考，请理性看待',
  };
}

export function getSharePosterFileName(targetDate: string, templateId: SharePosterTemplateId = 'mystic'): string {
  return templateId === 'mystic'
    ? `the-chosen-one-${targetDate}.png`
    : `the-chosen-one-${templateId}-${targetDate}.png`;
}

export async function createSharePosterPng(
  result: LuckyLotteryResult,
  targetDate: string,
  templateId: SharePosterTemplateId = 'mystic',
): Promise<Blob> {
  const model = createSharePosterModel(result, targetDate, templateId);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('当前环境不支持生成分享图');
  }

  canvas.width = model.width;
  canvas.height = model.height;
  const qrcode = await loadImage(`${import.meta.env.BASE_URL}qrcode.svg`);

  drawPoster(context, model, qrcode);

  return canvasToBlob(canvas);
}

function drawPoster(context: CanvasRenderingContext2D, model: SharePosterModel, qrcode: HTMLImageElement): void {
  if (model.template.id === 'focus') {
    drawFocusPoster(context, model, qrcode);
    return;
  }

  if (model.template.id === 'soft') {
    drawSoftPoster(context, model, qrcode);
    return;
  }

  drawBackground(context, model);
  drawHeader(context, model);
  drawFortune(context, model);
  drawElements(context, model);
  drawNumbers(context, model);
  drawQrPanel(context, model, qrcode);
  drawFooter(context, model);
}

function getPosterTemplate(templateId: SharePosterTemplateId): SharePosterTemplate {
  return SHARE_POSTER_TEMPLATES.find((template) => template.id === templateId) ?? SHARE_POSTER_TEMPLATES[0];
}

function getTemplateCopy(templateId: SharePosterTemplateId): {
  kicker: string;
  title: string;
  qrTitle: string;
  qrCaption: string;
} {
  if (templateId === 'focus') {
    return {
      kicker: 'DAILY SIGNAL',
      title: '今天就看这一组',
      qrTitle: '扫码看今日解读',
      qrCaption: '输入生辰，生成你的今日灵感',
    };
  }

  if (templateId === 'soft') {
    return {
      kicker: 'FLOW NOTE',
      title: '给今天的一张提示',
      qrTitle: '扫码留住今日提醒',
      qrCaption: '把今天适合做的事看清楚一点',
    };
  }

  return {
    kicker: 'BAZI DAILY FORTUNE',
    title: '今晚这组灵感',
    qrTitle: '扫码打开今日流日',
    qrCaption: '保存这张图，留给今天的自己看一眼',
  };
}

function drawFocusPoster(context: CanvasRenderingContext2D, model: SharePosterModel, qrcode: HTMLImageElement): void {
  const gradient = context.createLinearGradient(0, 0, 0, model.height);
  gradient.addColorStop(0, '#260f1b');
  gradient.addColorStop(0.48, '#111827');
  gradient.addColorStop(1, '#07202b');
  context.fillStyle = gradient;
  context.fillRect(0, 0, model.width, model.height);

  fillRoundedRect(context, 74, 74, 932, 1772, 44, 'rgba(255,255,255,0.055)');
  strokeRoundedRect(context, 74, 74, 932, 1772, 44, 'rgba(246,200,102,0.34)', 1.5);
  drawText(context, model.kicker, 118, 166, 28, '#f6c866', 900);
  drawText(context, model.brand, 962, 166, 30, '#fffaf0', 900, undefined, 'right');
  drawWrappedText(context, model.title, 118, 316, 86, '#fffaf0', 800, 96, 2);
  drawText(context, model.subtitle, 118, 410, 34, '#ffd8dd', 900);
  drawText(context, model.dateLine, 118, 468, 28, '#cbd5e1', 800);

  drawFocusNumbers(context, model);

  fillRoundedRect(context, 118, 1048, 844, 326, 30, 'rgba(15,23,42,0.82)');
  drawText(context, `${model.fortuneLabel} · ${model.score}`, 166, 1126, 52, '#4fd6bd', 900);
  drawWrappedText(context, model.personalFocus, 166, 1196, 30, '#edf3ff', 700, 46, 3);
  drawText(context, '今日适合', 166, 1322, 28, '#f6c866', 900);
  drawTags(context, model.suitable.slice(0, 4), 306, 1294, 620);

  fillRoundedRect(context, 118, 1528, 844, 212, 30, '#f8fafc');
  fillRoundedRect(context, 148, 1558, 140, 140, 18, '#ffffff');
  context.drawImage(qrcode, 160, 1570, 116, 116);
  drawText(context, model.qrTitle, 322, 1618, 36, '#111827', 900);
  drawWrappedText(context, model.qrCaption, 322, 1670, 27, '#334155', 520, 38, 2);
  drawText(context, model.footer, 118, 1810, 23, '#aeb7c9', 800);
}

function drawSoftPoster(context: CanvasRenderingContext2D, model: SharePosterModel, qrcode: HTMLImageElement): void {
  const gradient = context.createLinearGradient(0, 0, model.width, model.height);
  gradient.addColorStop(0, '#172033');
  gradient.addColorStop(0.52, '#0f1f2b');
  gradient.addColorStop(1, '#241826');
  context.fillStyle = gradient;
  context.fillRect(0, 0, model.width, model.height);

  fillRoundedRect(context, 96, 96, 888, 1728, 38, 'rgba(248,250,252,0.08)');
  strokeRoundedRect(context, 96, 96, 888, 1728, 38, 'rgba(255,255,255,0.16)', 1);
  drawText(context, model.kicker, 144, 176, 26, '#4fd6bd', 900);
  drawText(context, model.brand, 936, 176, 28, '#fffaf0', 900, undefined, 'right');
  drawText(context, model.title, 144, 318, 70, '#fffaf0', 900, 'Songti SC, SimSun, serif');
  drawText(context, model.dateLine, 144, 390, 28, '#cbd5e1', 800);

  fillRoundedRect(context, 144, 484, 792, 318, 30, 'rgba(255,255,255,0.08)');
  drawText(context, '今日吉凶', 184, 554, 28, '#f6c866', 900);
  drawText(context, `${model.fortuneLabel} · ${model.score}`, 184, 626, 54, '#fffaf0', 900);
  drawWrappedText(context, model.summary, 184, 700, 28, '#dce4f5', 680, 42, 2);

  drawText(context, '命盘五行', 144, 900, 31, '#4fd6bd', 900);
  model.elementRows.forEach((row, index) => {
    const x = 144 + index * 156;
    fillRoundedRect(context, x, 946, 116, 156, 22, 'rgba(255,255,255,0.07)');
    fillRoundedRect(context, x, 946 + 156 - Math.max(16, row.ratio * 120), 116, Math.max(16, row.ratio * 120), 22, row.color);
    drawText(context, row.element, x + 58, 1146, 28, '#fffaf0', 900, undefined, 'center');
  });

  drawText(context, '今日灵感', 144, 1268, 31, '#f6c866', 900);
  drawNumberStrip(context, model, 144, 1326, 112);

  fillRoundedRect(context, 144, 1580, 792, 164, 28, '#f8fafc');
  context.drawImage(qrcode, 168, 1604, 116, 116);
  drawText(context, model.qrTitle, 320, 1648, 34, '#111827', 900);
  drawWrappedText(context, model.qrCaption, 320, 1692, 25, '#334155', 520, 34, 2);
  drawText(context, model.footer, 144, 1800, 22, '#aeb7c9', 800);
}

function drawBackground(context: CanvasRenderingContext2D, model: SharePosterModel): void {
  const gradient = context.createLinearGradient(0, 0, model.width, model.height);
  gradient.addColorStop(0, '#10131f');
  gradient.addColorStop(0.52, '#151b2d');
  gradient.addColorStop(1, '#071a26');
  context.fillStyle = gradient;
  context.fillRect(0, 0, model.width, model.height);

  context.strokeStyle = 'rgba(255,255,255,0.055)';
  context.lineWidth = 1;
  for (let x = 0; x <= model.width; x += 84) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, model.height);
    context.stroke();
  }
  for (let y = 0; y <= model.height; y += 84) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(model.width, y);
    context.stroke();
  }

  strokeRoundedRect(context, 74, 72, 932, 1776, 44, 'rgba(246,200,102,0.35)', 1.5);
  strokeRoundedRect(context, 108, 106, 864, 1708, 32, 'rgba(255,255,255,0.11)', 1);
}

function drawHeader(context: CanvasRenderingContext2D, model: SharePosterModel): void {
  fillRoundedRect(context, 118, 132, 318, 58, 29, 'rgba(246,200,102,0.16)');
  strokeRoundedRect(context, 118, 132, 318, 58, 29, 'rgba(246,200,102,0.42)', 1);
  drawText(context, model.kicker, 152, 170, 25, '#fff2b2', 800);

  fillRoundedRect(context, 630, 132, 332, 58, 29, 'rgba(255,255,255,0.06)');
  strokeRoundedRect(context, 630, 132, 332, 58, 29, 'rgba(255,255,255,0.14)', 1);
  drawText(context, '★', 650, 171, 35, '#f6c866', 900);
  drawText(context, model.brand, 700, 170, 30, '#fffaf0', 900);

  context.strokeStyle = 'rgba(255,255,255,0.12)';
  context.beginPath();
  context.moveTo(118, 228);
  context.lineTo(962, 228);
  context.stroke();

  drawText(context, model.title, 118, 360, 92, '#f6c866', 900, 'Songti SC, SimSun, serif');
  drawText(context, model.subtitle, 118, 430, 36, '#fffaf0', 900);
  drawWrappedText(context, model.dateLine, 118, 486, 31, '#dce4f5', 760, 44, 2);
}

function drawFortune(context: CanvasRenderingContext2D, model: SharePosterModel): void {
  fillRoundedRect(context, 118, 590, 844, 318, 28, 'rgba(31,39,57,0.96)');
  strokeRoundedRect(context, 144, 618, 792, 262, 22, 'rgba(79,214,189,0.24)', 1);
  drawText(context, '今日流日吉凶', 176, 682, 30, '#4fd6bd', 900);
  drawText(context, `${model.fortuneLabel} · ${model.score}`, 176, 744, 52, '#fffaf0', 900);
  drawWrappedText(context, model.summary, 176, 806, 28, '#cfd6e6', 690, 42, 2);
  drawWrappedText(context, model.personalFocus, 176, 876, 26, '#aeb7c9', 690, 38, 2);
}

function drawElements(context: CanvasRenderingContext2D, model: SharePosterModel): void {
  drawText(context, '命盘五行可视化', 118, 1002, 34, '#fff2b2', 900);

  model.elementRows.forEach((row, index) => {
    const y = 1042 + index * 52;
    drawText(context, row.element, 118, y + 28, 26, '#dce4f5', 900);
    fillRoundedRect(context, 174, y + 8, 560, 20, 10, 'rgba(246,239,225,0.12)');
    fillRoundedRect(context, 174, y + 8, Math.max(16, 560 * row.ratio), 20, 10, row.color);
    drawText(context, String(row.count), 762, y + 29, 25, '#fffaf0', 900);
  });

  drawText(context, '今日适合', 118, 1350, 34, '#4fd6bd', 900);
  drawTags(context, model.suitable, 118, 1384, 812);
}

function drawNumbers(context: CanvasRenderingContext2D, model: SharePosterModel): void {
  drawText(context, '红蓝灵感数字', 118, 1510, 34, '#fff2b2', 900);
  const numbers = [...model.redNumbers, model.blueNumber];
  numbers.forEach((number, index) => {
    const x = 164 + index * 124;
    const gradient = context.createLinearGradient(x - 48, 1528, x + 48, 1624);
    if (index === numbers.length - 1) {
      gradient.addColorStop(0, '#8fc1ff');
      gradient.addColorStop(0.62, '#3477ff');
      gradient.addColorStop(1, '#183ba0');
    } else {
      gradient.addColorStop(0, '#ff8794');
      gradient.addColorStop(0.62, '#e42d49');
      gradient.addColorStop(1, '#91162a');
    }
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, 1574, 48, 0, Math.PI * 2);
    context.fill();
    drawText(context, number, x, 1590, 30, '#ffffff', 900, undefined, 'center');
  });
}

function drawFocusNumbers(context: CanvasRenderingContext2D, model: SharePosterModel): void {
  drawText(context, '红蓝灵感', 118, 602, 34, '#f6c866', 900);
  drawNumberStrip(context, model, 118, 668, 120);
  drawText(context, '今晚先记住这组提示', 118, 910, 34, '#fffaf0', 900);
}

function drawNumberStrip(
  context: CanvasRenderingContext2D,
  model: SharePosterModel,
  x: number,
  y: number,
  gap: number,
): void {
  const numbers = [...model.redNumbers, model.blueNumber];

  numbers.forEach((number, index) => {
    const centerX = x + 56 + index * gap;
    const radius = index === numbers.length - 1 ? 54 : 50;
    const gradient = context.createLinearGradient(centerX - radius, y, centerX + radius, y + radius * 2);

    if (index === numbers.length - 1) {
      gradient.addColorStop(0, '#8fc1ff');
      gradient.addColorStop(0.62, '#3477ff');
      gradient.addColorStop(1, '#17389e');
    } else {
      gradient.addColorStop(0, '#ff8794');
      gradient.addColorStop(0.62, '#e42d49');
      gradient.addColorStop(1, '#91162a');
    }

    context.fillStyle = gradient;
    context.beginPath();
    context.arc(centerX, y + radius, radius, 0, Math.PI * 2);
    context.fill();
    drawText(context, number, centerX, y + radius + 12, 32, '#ffffff', 900, undefined, 'center');
  });
}

function drawQrPanel(context: CanvasRenderingContext2D, model: SharePosterModel, qrcode: HTMLImageElement): void {
  fillRoundedRect(context, 118, 1644, 844, 154, 28, '#f8fafc');
  fillRoundedRect(context, 144, 1668, 108, 108, 16, '#ffffff');
  context.drawImage(qrcode, 154, 1678, 88, 88);
  drawText(context, model.qrTitle, 286, 1698, 34, '#111827', 900);
  drawText(context, model.qrCaption, 286, 1742, 25, '#334155', 800);
}

function drawFooter(context: CanvasRenderingContext2D, model: SharePosterModel): void {
  drawText(context, model.footer, 118, 1834, 24, '#aeb7c9', 800);
  drawText(context, '长按保存 / 扫码进入', 962, 1834, 24, '#f6c866', 900, undefined, 'right');
}

function drawTags(context: CanvasRenderingContext2D, tags: string[], x: number, y: number, maxWidth: number): void {
  let currentX = x;
  let currentY = y;
  context.font = font(24, 850);

  for (const tag of tags) {
    const width = Math.min(maxWidth, context.measureText(tag).width + 32);
    if (currentX + width > x + maxWidth) {
      currentX = x;
      currentY += 50;
    }
    fillRoundedRect(context, currentX, currentY, width, 36, 18, 'rgba(79,214,189,0.12)');
    strokeRoundedRect(context, currentX, currentY, width, 36, 18, 'rgba(79,214,189,0.26)', 1);
    drawText(context, tag, currentX + 16, currentY + 26, 24, '#dffbf6', 850);
    currentX += width + 10;
  }
}

function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  color: string,
  maxWidth: number,
  lineHeight: number,
  maxLines = 3,
): void {
  context.font = font(size, 760);
  const lines: string[] = [];
  let line = '';

  for (const char of text) {
    const next = line + char;
    if (context.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = char;
      if (lines.length === maxLines - 1) break;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);

  lines.slice(0, maxLines).forEach((item, index) => {
    drawText(context, item, x, y + index * lineHeight, size, color, 760);
  });
}

function drawText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  color: string,
  weight: number,
  family = '"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", Arial, sans-serif',
  align: CanvasTextAlign = 'left',
): void {
  context.font = font(size, weight, family);
  context.fillStyle = color;
  context.textAlign = align;
  context.textBaseline = 'alphabetic';
  context.fillText(text, x, y);
  context.textAlign = 'left';
}

function font(size: number, weight: number, family = '"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", Arial, sans-serif'): string {
  return `${weight} ${size}px ${family}`;
}

function fillRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  color: string | CanvasGradient,
): void {
  roundedRect(context, x, y, width, height, radius);
  context.fillStyle = color;
  context.fill();
}

function strokeRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  color: string,
  lineWidth: number,
): void {
  roundedRect(context, x, y, width, height, radius);
  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  context.stroke();
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('二维码加载失败，请稍后重试'));
    image.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('分享图生成失败，请稍后重试'));
      }
    }, 'image/png');
  });
}

function formatNumber(value: number): string {
  return String(value).padStart(2, '0');
}
