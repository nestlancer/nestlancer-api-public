import {
  expandDocumentNumberCandidates,
  isLegacyDocumentNumber,
} from '../../src/document-number-aliases';

describe('document-number-aliases', () => {
  it('expands INV-NL printed numbers to NL-INV registry candidates', () => {
    const candidates = expandDocumentNumberCandidates('INV-NL-2026-0002');
    expect(candidates).toEqual(
      expect.arrayContaining([
        'INV-NL-2026-0002',
        'NL-INV-2026-0002',
        'NL-INV-2026-000002',
      ]),
    );
  });

  it('expands NL-INV to legacy INV-NL forms', () => {
    const candidates = expandDocumentNumberCandidates('NL-INV-2026-000107');
    expect(candidates).toEqual(
      expect.arrayContaining(['NL-INV-2026-000107', 'INV-NL-2026-000107', 'INV-NL-2026-107']),
    );
  });

  it('detects legacy invoice numbers', () => {
    expect(isLegacyDocumentNumber('INV-NL-2026-0002')).toBe(true);
    expect(isLegacyDocumentNumber('NL-INV-2026-000002')).toBe(false);
  });
});
