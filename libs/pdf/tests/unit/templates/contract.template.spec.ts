import { getContractTemplate } from '../../../src/templates/contract.template';

describe('ContractTemplate', () => {
  it('renders MSA and SOW sections', () => {
    const result = getContractTemplate({
      msaTerms: 'Standard platform terms',
      sowTerms: 'Custom milestone clause',
      totalPaise: 100000,
      currency: 'INR',
      items: [{ description: 'Build', quantity: 1, unitPricePaise: 100000, totalPaise: 100000 }],
    });
    expect(result).toContain('Master Service Terms');
    expect(result).toContain('Standard platform terms');
    expect(result).toContain('Project-Specific Terms');
    expect(result).toContain('Custom milestone clause');
    expect(result).toContain('Statement of Work');
  });

  it('renders draft banner when previewing', () => {
    const result = getContractTemplate({ isDraft: true, totalPaise: 0, currency: 'INR' });
    expect(result).toContain('DRAFT');
    expect(result).toContain('For review only');
  });
});
