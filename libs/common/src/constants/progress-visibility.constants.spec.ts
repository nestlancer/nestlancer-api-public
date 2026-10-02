import {
  clientVisibleProgressFilter,
  isClientVisibleProgress,
  normalizeProgressVisibility,
  PROGRESS_VISIBILITY,
} from './progress-visibility.constants';

describe('progress-visibility.constants', () => {
  it('normalizes legacy client visibility', () => {
    expect(normalizeProgressVisibility('client')).toBe(PROGRESS_VISIBILITY.CLIENT);
    expect(normalizeProgressVisibility('CLIENT_VISIBLE')).toBe(PROGRESS_VISIBILITY.CLIENT);
  });

  it('normalizes internal visibility', () => {
    expect(normalizeProgressVisibility('INTERNAL')).toBe(PROGRESS_VISIBILITY.INTERNAL);
    expect(normalizeProgressVisibility('internal')).toBe(PROGRESS_VISIBILITY.INTERNAL);
  });

  it('filters client-visible entries', () => {
    expect(clientVisibleProgressFilter()).toEqual({
      visibility: { in: ['client', 'CLIENT_VISIBLE'] },
    });
  });

  it('detects client-visible values', () => {
    expect(isClientVisibleProgress('client')).toBe(true);
    expect(isClientVisibleProgress('INTERNAL')).toBe(false);
  });
});
