import { DocumentType } from '@prisma/client';
import { DocumentNumberService } from '../../src/document-number.service';

describe('DocumentNumberService', () => {
  let service: DocumentNumberService;
  let prismaWrite: { documentSequence: { upsert: jest.Mock } };

  beforeEach(() => {
    prismaWrite = {
      documentSequence: {
        upsert: jest.fn().mockResolvedValue({ lastNumber: 42 }),
      },
    };
    service = new DocumentNumberService(prismaWrite as any);
  });

  it('assigns a padded document number with type prefix and year', async () => {
    const year = new Date().getFullYear();
    const result = await service.assignNumber(DocumentType.INVOICE);

    expect(result).toBe(`NL-INV-${year}-000042`);
    expect(prismaWrite.documentSequence.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { type_year: { type: DocumentType.INVOICE, year } },
      }),
    );
  });

  it('uses transaction client when provided', async () => {
    const tx = { documentSequence: { upsert: jest.fn().mockResolvedValue({ lastNumber: 1 }) } };
    const result = await service.assignNumber(DocumentType.QUOTE, tx as any);

    expect(result).toMatch(/^NL-QTE-\d{4}-000001$/);
    expect(tx.documentSequence.upsert).toHaveBeenCalled();
    expect(prismaWrite.documentSequence.upsert).not.toHaveBeenCalled();
  });
});
