import { mapPackageToQuoteItems } from '../../../src/utils/quote-package-prefill.util';

describe('mapPackageToQuoteItems', () => {
  it('maps deliverables with unitPrice in major units', () => {
    const items = mapPackageToQuoteItems([
      { description: 'Discovery', quantity: 1, unitPrice: 15000 },
      { label: 'Design', quantity: 2, unitPrice: 10000 },
    ]);

    expect(items).toEqual([
      { description: 'Discovery', quantity: 1, unitPrice: 15000 },
      { description: 'Design', quantity: 2, unitPrice: 10000 },
    ]);
  });

  it('maps unitPricePaise to major units', () => {
    const items = mapPackageToQuoteItems([{ description: 'API work', unitPricePaise: 2500000 }]);

    expect(items[0].unitPrice).toBe(25000);
  });

  it('includes optional add-ons when requested', () => {
    const items = mapPackageToQuoteItems(
      [{ description: 'Core', unitPrice: 50000 }],
      [{ description: 'Add-on module', unitPrice: 20000, optional: true }],
      true,
    );

    expect(items).toHaveLength(2);
    expect(items[1].description).toBe('Add-on module');
  });

  it('skips add-ons by default', () => {
    const items = mapPackageToQuoteItems(
      [{ description: 'Core', unitPrice: 50000 }],
      [{ description: 'Add-on module', unitPrice: 20000 }],
      false,
    );

    expect(items).toHaveLength(1);
  });
});
