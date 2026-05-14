import { describe, expect, it } from 'vitest';
import {
  DEEPSEEK_SETTINGS_KEY,
  clearDeepSeekSettings,
  loadDeepSeekSettings,
  loadUserProfile,
  saveDeepSeekSettings,
} from '../../src/domain/deepseekSettings';
import { isUserProfileFilled } from '../../src/domain/consultation';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('deepseek settings storage', () => {
  it('uses a safe default when no settings are saved', () => {
    expect(loadDeepSeekSettings(new MemoryStorage())).toEqual({
      apiKey: '',
      model: 'deepseek-v4-flash',
    });
  });

  it('saves and restores the local api settings', () => {
    const storage = new MemoryStorage();

    saveDeepSeekSettings({ apiKey: ' sk-live ', model: 'deepseek-v4-pro' }, storage);

    expect(loadDeepSeekSettings(storage)).toEqual({
      apiKey: 'sk-live',
      model: 'deepseek-v4-pro',
    });
  });

  it('clears saved api settings', () => {
    const storage = new MemoryStorage();
    storage.setItem(DEEPSEEK_SETTINGS_KEY, '{"apiKey":"sk-live","model":"deepseek-v4-pro"}');

    clearDeepSeekSettings(storage);

    expect(loadDeepSeekSettings(storage).apiKey).toBe('');
  });

  it('keeps legacy user profile focus data compatible but non-required', () => {
    const storage = new MemoryStorage();
    storage.setItem('the-chosen-one:user-profile', JSON.stringify({
      nickname: '',
      occupation: '',
      currentFocus: 'career',
      customNote: '',
    }));

    const profile = loadUserProfile(storage);

    expect(profile.currentFocus).toBe('career');
    expect(isUserProfileFilled(profile)).toBe(false);
  });
});
