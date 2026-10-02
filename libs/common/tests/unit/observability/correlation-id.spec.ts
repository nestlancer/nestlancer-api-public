import { normalizeCorrelationId } from '../../../src/observability/correlation-id';

describe('normalizeCorrelationId', () => {
  it('returns the first uuid from a comma-joined string', () => {
    expect(
      normalizeCorrelationId(
        '8362dac6-9fca-493c-a651-63f156d1a4b7, 8362dac6-9fca-493c-a651-63f156d1a4b7,a752eb27-9aa5-40f1-8373-dd69988848ed',
      ),
    ).toBe('8362dac6-9fca-493c-a651-63f156d1a4b7');
  });

  it('handles arrays', () => {
    expect(
      normalizeCorrelationId([
        'a752eb27-9aa5-40f1-8373-dd69988848ed',
        '8362dac6-9fca-493c-a651-63f156d1a4b7',
      ]),
    ).toBe('a752eb27-9aa5-40f1-8373-dd69988848ed');
  });

  it('returns undefined for empty input', () => {
    expect(normalizeCorrelationId(undefined, null, '', '-')).toBeUndefined();
  });

  it('echoes a non-uuid client id even when a server uuid was appended', () => {
    expect(
      normalizeCorrelationId(
        'AUDIT-TRACE-20260917-77, 1d3d750a-85a3-43b3-9874-e62d7f5a217d',
      ),
    ).toBe('AUDIT-TRACE-20260917-77');
  });

  it('rejects overlong and HTML-ish client ids', () => {
    expect(normalizeCorrelationId('A'.repeat(600))).toBeUndefined();
    expect(normalizeCorrelationId('ok-id <script>x</script>')).toBeUndefined();
    expect(normalizeCorrelationId("'; DROP TABLE logs;--")).toBeUndefined();
  });

  it('falls back to a later valid candidate when the first is garbage', () => {
    expect(
      normalizeCorrelationId('A'.repeat(600), '8362dac6-9fca-493c-a651-63f156d1a4b7'),
    ).toBe('8362dac6-9fca-493c-a651-63f156d1a4b7');
  });
});
