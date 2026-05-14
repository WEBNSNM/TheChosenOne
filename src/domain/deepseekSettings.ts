import type { DeepSeekModel } from './deepseekClient';
import { EMPTY_USER_PROFILE, type UserProfile } from './consultation';
import { getBrowserStorage } from './formStorage';

export interface DeepSeekSettings {
  apiKey: string;
  model: DeepSeekModel;
}

export const DEEPSEEK_SETTINGS_KEY = 'the-chosen-one:deepseek-settings';
const USER_PROFILE_KEY = 'the-chosen-one:user-profile';

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

export function loadUserProfile(storage = getBrowserStorage()): UserProfile {
  if (!storage) return EMPTY_USER_PROFILE;

  try {
    const raw = storage.getItem(USER_PROFILE_KEY);
    if (!raw) return EMPTY_USER_PROFILE;

    const parsed = JSON.parse(raw) as Partial<UserProfile>;

    return {
      nickname: typeof parsed.nickname === 'string' ? parsed.nickname : '',
      occupation: typeof parsed.occupation === 'string' ? parsed.occupation : '',
      customNote: typeof parsed.customNote === 'string' ? parsed.customNote : '',
      currentFocus: isCurrentFocus(parsed.currentFocus) ? parsed.currentFocus : undefined,
    };
  } catch {
    return EMPTY_USER_PROFILE;
  }
}

export function saveUserProfile(profile: UserProfile, storage = getBrowserStorage()): void {
  if (!storage) return;

  try {
    storage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // localStorage may be unavailable.
  }
}

const currentFocusValues = new Set(['', 'career', 'relationship', 'health', 'finance', 'study']);

function isCurrentFocus(value: unknown): value is UserProfile['currentFocus'] {
  return typeof value === 'string' && currentFocusValues.has(value);
}
