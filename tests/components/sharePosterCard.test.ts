import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const componentSource = readFileSync(
  resolve(process.cwd(), 'src/components/SharePosterCard.vue'),
  'utf-8',
);

describe('SharePosterCard component contract', () => {
  it('uses a fullscreen modal for poster preview instead of an inline page preview', () => {
    expect(componentSource).toContain('class="poster-modal"');
    expect(componentSource).toContain('<Teleport to="body">');
    expect(componentSource).toContain('role="dialog"');
    expect(componentSource).toContain('aria-modal="true"');
    expect(componentSource).toContain('下载 PNG');
    expect(componentSource).not.toContain('class="poster-preview"');
  });
});
