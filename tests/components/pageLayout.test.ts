import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

function readSource(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf-8');
}

describe('page layout contracts', () => {
  it('uses a mobile rem baseline that scales from the phone viewport', () => {
    const source = readSource('src/style.css');

    expect(source).toContain('html {');
    expect(source).toContain('font-size: 16px;');
    expect(source).toContain('@media (max-width: 560px)');
    expect(source).toContain('font-size: clamp(14px, 4.2667vw, 18px);');
  });

  it('keeps the mobile hero compact so paid features appear earlier', () => {
    const source = readSource('src/style.css');

    expect(source).toContain('min-height: 300px;');
    expect(source).toContain('padding: 28px 14px 18px;');
    expect(source).toContain('font-size: clamp(2.2rem, 10vw, 2.65rem);');
    expect(source).toContain('grid-template-columns: repeat(2, minmax(0, 1fr));');
    expect(source).toContain('min-height: 52px;');
  });

  it('keeps the share poster on the inspiration page next to the number result', () => {
    const source = readSource('src/components/LeadPage.vue');

    expect(source).toContain("import SharePosterCard from './SharePosterCard.vue'");
    expect(source.indexOf('<FortuneBoard')).toBeLessThan(source.indexOf('<SharePosterCard'));
    expect(source).toContain(':target-date="modelValue.targetDate"');
  });

  it('keeps chart input and paid report together in a focused modal', () => {
    const source = readSource('src/components/LeadPage.vue');

    expect(source).toContain('const isChartModalOpen = ref(false)');
    expect(source).toContain('class="chart-entry-card"');
    expect(source).toContain('class="chart-modal"');
    expect(source.indexOf('<FortuneForm')).toBeLessThan(source.indexOf('<PremiumReportPreview'));
    expect(source).not.toContain("import ChartCalibrationCard");
    expect(source).not.toContain('<ChartCalibrationCard');
  });

  it('styles the chart modal as a compact mobile-first surface', () => {
    const source = readSource('src/style.css');

    expect(source).toContain('.chart-entry-card');
    expect(source).toContain('.chart-modal');
    expect(source).toContain('.chart-modal-shell');
    expect(source).toContain('max-height: min(88vh, 760px);');
  });

  it('puts the daily consultation summary directly in the consultation hero', () => {
    const source = readSource('src/App.vue');

    expect(source).toContain('class="hero-consultation-panel"');
    expect(source).toContain('class="hero-detail-toggle"');
    expect(source).toContain('class="hero-fortune-badge"');
    expect(source).toContain('result.dailyFortune.suitable.slice(0, 4)');
    expect(source).toContain('result.dailyFortune.personalFocus');
  });

  it('opens detailed chart information from the consultation hero without expanding the page', () => {
    const source = readSource('src/App.vue');

    expect(source).toContain('const isHeroDetailOpen = ref(false)');
    expect(source).toContain('class="hero-detail-modal"');
    expect(source).toContain('class="hero-detail-shell"');
    expect(source).toContain('本命四柱');
    expect(source).toContain('流日三柱');
    expect(source).toContain('class="hero-detail-pillars"');
    expect(source).toContain('class="hero-detail-pillar-card"');
    expect(source).toContain('class="hero-detail-pillar-row"');
    expect(source).toContain('result.profile.birth.pillars');
    expect(source).toContain('result.profile.transit.pillars');
    expect(source.indexOf('class="hero-detail-pillars"')).toBeLessThan(source.indexOf('class="hero-detail-highlight"'));
    expect(source).toContain('今日忌讳');
    expect(source).toContain('result.dailyFortune.avoid');
  });

  it('keeps the consultation page focused by removing repeated chart summaries', () => {
    const source = readSource('src/components/ConsultationPage.vue');

    expect(source).not.toContain('class="consultation-summary-card"');
    expect(source).not.toContain('class="summary-chip-row"');
    expect(source).not.toContain('class="daily-action-grid"');
    expect(source).not.toContain('class="consultation-detail-drawer"');
    expect(source).not.toContain('class="paid-intro-card"');
    expect(source).not.toContain("import SharePosterCard");
    expect(source).not.toContain("import DailyFortuneCard");
    expect(source).not.toContain("import PillarGrid");
    expect(source).not.toContain("import PremiumReportPreview");
  });

  it('uses compact consultation summary typography for mobile readability', () => {
    const source = readSource('src/style.css');

    expect(source).toContain('.hero-consultation-panel');
    expect(source).toContain('.hero-detail-toggle');
    expect(source).toContain('.hero-detail-modal');
    expect(source).toContain('overflow: visible;');
    expect(source).toContain('.hero-suitable-tags span');
    expect(source).toContain('font-size: 0.78rem;');
  });

  it('starts the consultation hub with model settings collapsed', () => {
    const source = readSource('src/components/ConsultationHub.vue');

    expect(source).toContain('const settingsOpen = ref(false)');
    expect(source).toContain('v-if="settingsOpen"');
    expect(source).toContain('class="settings-toggle"');
  });
});
