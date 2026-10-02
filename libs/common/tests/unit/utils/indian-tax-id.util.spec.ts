import {
  isValidGstin,
  isValidPan,
  normalizeGstinOrNull,
  normalizePanOrNull,
} from '../../../src/utils/indian-tax-id.util';

describe('indian-tax-id.util (NL-BUG-PDF-013)', () => {
  it('accepts valid GSTIN and PAN', () => {
    expect(isValidGstin('29AABCT1332L1ZV')).toBe(true);
    expect(isValidPan('AABCT1332L')).toBe(true);
    expect(normalizeGstinOrNull('29aabct1332l1zv')).toBe('29AABCT1332L1ZV');
    expect(normalizePanOrNull('aabct1332l')).toBe('AABCT1332L');
  });

  it('rejects free-text like ASDASD', () => {
    expect(isValidGstin('ASDASD')).toBe(false);
    expect(isValidPan('ASDASD')).toBe(false);
    expect(normalizeGstinOrNull('ASDASD')).toBeNull();
    expect(normalizePanOrNull('ASDASD')).toBeNull();
  });

  it('treats blank as null', () => {
    expect(normalizeGstinOrNull('')).toBeNull();
    expect(normalizePanOrNull('   ')).toBeNull();
    expect(isValidGstin(null)).toBe(false);
  });
});
