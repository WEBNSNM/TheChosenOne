import type { DeepSeekModel } from './deepseekClient';
import { getBrowserStorage } from './formStorage';

export interface DeepSeekSettings {
  apiKey: string;
  model: DeepSeekModel;
}

export const DEEPSEEK_SETTINGS_KEY = 'the-chosen-one:deepseek-settings';

const DEFAULT_SETTINGS: DeepSeekSettings = {
  apiKey: '',
  model: 'deepseek-v4-flash',
};

const modelValues = new Set<DeepSeekModel>(['deepseek-v4-flash', 'deepseek-v4-pro']);

export function loadDeepSeekSettings(storage = getBrowserStorage()): DeepSeekSettings {
  if (!storage) return DEFAULT_SETTINGS;

  try {
    const raw = storage.getItem(DEEPSEEK_SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;

    const parsed = JSON.parse(raw) as Partial<DeepSeekSettings>;

    return {
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey.trim() : '',
      model: modelValues.has(parsed.model as DeepSeekModel) ? parsed.model as DeepSeekModel : DEFAULT_SETTINGS.model,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveDeepSeekSettings(settings: DeepSeekSettings, storage = getBrowserStorage()): void {
  if (!storage) return;

  try {
    storage.setItem(
      DEEPSEEK_SETTINGS_KEY,
      JSON.stringify({
        apiKey: settings.apiKey.trim(),
        model: settings.model,
      }),
    );
  } catch {
    // localStorage may be unavailable in some embedded browsers.
  }
}

export function clearDeepSeekSettings(storage = getBrowserStorage()): void {
  if (!storage) return;

  try {
    storage.removeItem(DEEPSEEK_SETTINGS_KEY);
  } catch {
    // Ignore blocked storage in restricted shells.
  }
}
