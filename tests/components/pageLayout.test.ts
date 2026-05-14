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

  it('keeps chart input in a focused modal and paid report on the lead page', () => {
    const modalSource = readSource('src/components/ChartSetupModal.vue');
    const leadSource = readSource('src/components/LeadPage.vue');
    const appSource = readSource('src/App.vue');

    expect(appSource).toContain('const isSetupModalOpen = ref(false)');
    expect(appSource).toContain('<ChartSetupModal');
    expect(modalSource).toContain('class="chart-modal"');
    expect(modalSource).toContain('<FortuneForm');
    expect(modalSource).not.toContain('<PremiumReportPreview');
    expect(leadSource).toContain('<PremiumReportPreview');
  });

  it('uses a separate inspiration button and renames the chart form submit', () => {
    const leadSource = readSource('src/components/LeadPage.vue');
    const formSource = readSource('src/components/FortuneForm.vue');

    expect(leadSource).toContain('class="primary-action inspiration-action"');
    expect(leadSource).toContain('<span>生成灵感</span>');
    expect(leadSource).toContain("@click=\"emit('submit')\"");
    expect(formSource).toContain('<span>保存命盘并生成</span>');
  });

  it('styles the chart modal as a compact mobile-first surface', () => {
    const source = readSource('src/style.css');

    expect(source).toContain('.chart-entry-card');
    expect(source).toContain('.chart-modal');
    expect(source).toContain('.chart-modal-shell');
    expect(source).toContain('max-height: min(88vh, 760px);');
  });

  it('prevents long form text from creating horizontal scrolling', () => {
    const source = readSource('src/style.css');

    expect(source).toContain('max-width: 100%;');
    expect(source).toContain('min-width: 0;');
    expect(source).toContain('overflow-x: hidden;');
    expect(source).toContain('overflow-wrap: anywhere;');
    expect(source).toContain('word-break: break-word;');
  });

  it('keeps long uploaded image names inside the upload control', () => {
    const source = readSource('src/style.css');

    expect(source).toContain('width: min(100%, 360px);');
    expect(source).toContain('.upload-drop span');
    expect(source).toContain('text-overflow: ellipsis;');
    expect(source).toContain('white-space: nowrap;');
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
    expect(source).toContain('.hero-detail-pillar-card');
    expect(source).toContain('.hero-suitable-tags span');
    expect(source).toContain('font-size: 0.78rem;');
  });

  it('requests the shared setup modal for missing chart or required profile', () => {
    const source = readSource('src/components/ConsultationHub.vue');

    expect(source).toContain('emit(\'requestSetup\'');
    expect(source).toContain('sceneRequiresUserProfile(selectedSceneId.value)');
    expect(source).toContain('!isUserProfileFilled(props.userProfile)');
    expect(source).toContain('profileRequired: true');
  });

  it('removes user-side model service configuration from consultation hub', () => {
    const source = readSource('src/components/ConsultationHub.vue');

    expect(source).not.toContain('模型服务');
    expect(source).not.toContain('settingsOpen');
    expect(source).not.toContain('Settings2');
    expect(source).not.toContain('ShieldCheck');
    expect(source).not.toContain('model-note');
    expect(source).toContain('class="settings-toggle"');
  });
});
