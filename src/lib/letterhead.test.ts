import { describe, expect, it } from 'vitest';
import { LETTERHEAD_RECOMMENDED, letterheadSizeTip } from './letterhead';

describe('letterheadSizeTip', () => {
  it('accepts the recommended size and other wide, large banners', () => {
    expect(letterheadSizeTip(LETTERHEAD_RECOMMENDED.width, LETTERHEAD_RECOMMENDED.height)).toBeNull();
    expect(letterheadSizeTip(2480, 400)).toBeNull();
  });

  it('warns about small images', () => {
    expect(letterheadSizeTip(600, 80)).toMatch(/600\u00a0×\u00a080\u00a0px.*blurry.*1600\u00a0×\u00a0200/);
  });

  it('warns about tall or square images', () => {
    expect(letterheadSizeTip(1200, 1200)).toMatch(/Tall images/);
    expect(letterheadSizeTip(2000, 600)).toMatch(/Tall images/);
  });
});
