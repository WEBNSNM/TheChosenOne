import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function readSource(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf-8');
}

describe('page layout contracts', () => {
  it('keeps the share poster on the inspiration page next to the number result', () => {
    const source = readSource('src/components/LeadPage.vue');

    expect(source).toContain("import SharePosterCard from './SharePosterCard.vue'");
    expect(source.indexOf('<FortuneBoard')).toBeLessThan(source.indexOf('<SharePosterCard'));
    expect(source).toContain(':target-date="modelValue.targetDate"');
  });

  it('keeps the consultation page short by removing expanded result sections', () => {
    const source = readSource('src/components/ConsultationPage.vue');

    expect(source).toContain('class="consultation-summary-card"');
    expect(source).toContain('<details class="consultation-detail-drawer"');
    expect(source).not.toContain("import SharePosterCard");
    expect(source).not.toContain("import DailyFortuneCard");
    expect(source).not.toContain("import PillarGrid");
    expect(source).not.toContain("import PremiumReportPreview");
  });

  it('starts the consultation hub with model settings collapsed', () => {
    const source = readSource('src/components/ConsultationHub.vue');

    expect(source).toContain('const settingsOpen = ref(false)');
    expect(source).toContain('v-if="settingsOpen"');
    expect(source).toContain('class="settings-toggle"');
  });
});
