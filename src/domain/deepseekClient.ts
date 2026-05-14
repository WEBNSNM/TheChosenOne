export type DeepSeekModel = 'deepseek-v4-flash' | 'deepseek-v4-pro';

export type DeepSeekMessageContent =
  | string
  | Array<
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } }
  >;

export interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: DeepSeekMessageContent;
}

export interface DeepSeekModelOption {
  value: DeepSeekModel;
  label: string;
  description: string;
}

export interface AskDeepSeekOptions {
  apiKey: string;
  messages: DeepSeekMessage[];
  model: DeepSeekModel;
  signal?: AbortSignal;
}

interface DeepSeekResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
  error?: {
    message?: string;
  };
}

export const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/chat/completions';

export const DEEPSEEK_MODELS: DeepSeekModelOption[] = [
  {
    value: 'deepseek-v4-flash',
    label: 'V4 Flash',
    description: '响应更快，适合日常解读与轻量追问。',
  },
  {
    value: 'deepseek-v4-pro',
    label: 'V4 Pro',
    description: '质量优先，适合长文本报告与复杂盘面。',
  },
];

export function createDeepSeekPayload(messages: DeepSeekMessage[], model: DeepSeekModel) {
  return {
    model,
    messages,
    temperature: 0.7,
    max_tokens: 4096,
    thinking: {
      type: 'disabled',
    },
  };
}

export async function askDeepSeek({ apiKey, messages, model, signal }: AskDeepSeekOptions): Promise<string> {
  const response = await fetch(DEEPSEEK_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify(createDeepSeekPayload(messages, model)),
    signal,
  });
  const payload = await readResponse(response);

  if (!response.ok) {
    throw new Error(toDeepSeekErrorMessage(response.status, payload));
  }

  const content = payload.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error('DeepSeek 返回为空，请稍后重试或换一个问题。');
  }

  return content;
}

async function readResponse(response: Response): Promise<DeepSeekResponse> {
  try {
    return await response.json() as DeepSeekResponse;
  } catch {
    return {};
  }
}

function toDeepSeekErrorMessage(status: number, payload: DeepSeekResponse): string {
  const message = payload.error?.message?.trim();

  if (status === 401) return 'DeepSeek API Key 无效，请检查后再试。';
  if (status === 402) return 'DeepSeek 账户额度不足，请到控制台确认。';
  if (status === 429) return '请求过于频繁，请稍后再试。';
  if (message) return `DeepSeek 调用失败：${message}`;

  return `DeepSeek 调用失败，HTTP ${status}。浏览器直连也可能被跨域策略拦截，正式版本建议走后端中转。`;
}
