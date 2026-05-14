import { describe, expect, it, vi } from 'vitest';
import {
  createDeepSeekPayload,
  askDeepSeek,
  DEEPSEEK_ENDPOINT,
  type DeepSeekMessage,
} from '../../src/domain/deepseekClient';

const messages: DeepSeekMessage[] = [
  { role: 'system', content: '保持温和、克制。' },
  { role: 'user', content: '解读今天的行动节奏。' },
];

describe('deepseek client', () => {
  it('creates the official chat completion payload for a concise reading', () => {
    expect(createDeepSeekPayload(messages, 'deepseek-v4-flash')).toEqual({
      model: 'deepseek-v4-flash',
      messages,
      temperature: 0.7,
      max_tokens: 4096,
      thinking: {
        type: 'disabled',
      },
    });
  });

  it('keeps OpenAI-compatible image message content in the payload', () => {
    const multimodalMessages: DeepSeekMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: '请看这张命盘截图。' },
          { type: 'image_url', image_url: { url: 'data:image/png;base64,abc' } },
        ],
      },
    ];

    expect(createDeepSeekPayload(multimodalMessages, 'deepseek-v4-flash').messages).toEqual(multimodalMessages);
  });

  it('sends the request with bearer auth and returns the assistant content', async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: '今天适合整理节奏。',
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(askDeepSeek({ apiKey: 'sk-test', messages, model: 'deepseek-v4-flash' })).resolves.toBe(
      '今天适合整理节奏。',
    );

    expect(fetchMock).toHaveBeenCalledWith(
      DEEPSEEK_ENDPOINT,
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer sk-test',
        },
      }),
    );

    vi.unstubAllGlobals();
  });
});
