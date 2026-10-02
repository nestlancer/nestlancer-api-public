import {
  getLogoFullDataUri,
  getLogoIconDataUri,
  getLogoFullBuffer,
  getLogoIconBuffer,
  BRAND_COLORS,
} from '../../src/utils/brand.util';

describe('brand.util', () => {
  it('should expose brand colors', () => {
    expect(BRAND_COLORS.navy).toBe('#272A7A');
    expect(BRAND_COLORS.teal).toBe('#16B6A5');
  });

  it('should load logo assets as data URIs', () => {
    const full = getLogoFullDataUri();
    const icon = getLogoIconDataUri();

    expect(full).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(icon).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  it('should load logo assets as buffers', () => {
    const full = getLogoFullBuffer().toString('utf-8');
    const icon = getLogoIconBuffer().toString('utf-8');

    expect(full).toContain('<svg');
    expect(icon).toContain('<svg');
    expect(full).toContain('#272A7A');
    expect(icon).toContain('#16B6A5');
  });
});
