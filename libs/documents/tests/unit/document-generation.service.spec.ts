import { DocumentStatus, DocumentType } from '@prisma/client';
import { PDF_TEMPLATE_VERSION } from '@nestlancer/pdf';
import { DocumentGenerationService } from '../../src/document-generation.service';

describe('DocumentGenerationService', () => {
  let service: DocumentGenerationService;
  let prismaRead: any;
  let prismaWrite: any;
  let pdfService: { generate: jest.Mock };
  let documentNumber: { assignNumber: jest.Mock };
  let documentStorage: any;
  let tx: any;

  const latestDoc = {
    id: 'doc-1',
    documentNumber: 'NL-INV-2026-000001',
    documentType: DocumentType.INVOICE,
    versionNumber: 1,
    isLatest: true,
    isImmutable: false,
    storageBucket: 'nestlancer-pdfs',
    storageKey: 'invoices/p1/v1/NL-INV-2026-000001.pdf',
    fileHash: 'abc123',
    status: DocumentStatus.GENERATED,
    issuedAt: new Date('2026-06-08T10:00:00Z'),
    entityType: 'PAYMENT',
    entityId: 'pay-1',
  };

  beforeEach(() => {
    tx = {
      $executeRaw: jest.fn().mockResolvedValue(0),
      payment: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      generatedDocument: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockImplementation((args: { data: { versionNumber: number } }) =>
          Promise.resolve({
            id: 'doc-2',
            documentNumber: 'NL-INV-2026-000001',
            documentType: DocumentType.INVOICE,
            versionNumber: args.data.versionNumber,
            storageBucket: 'nestlancer-pdfs',
            storageKey: `invoices/p1/v${args.data.versionNumber}/NL-INV-2026-000001.pdf`,
          }),
        ),
      },
    };

    prismaRead = {
      generatedDocument: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([latestDoc]),
        findUnique: jest.fn().mockResolvedValue(latestDoc),
      },
      payment: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    prismaWrite = {
      $transaction: jest.fn(async (cb: (client: typeof tx) => Promise<unknown>) => cb(tx)),
      payment: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      generatedDocument: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockImplementation((args: { data: { versionNumber?: number } }) =>
          Promise.resolve({
            id: 'doc-1',
            documentNumber: 'NL-INV-2026-000001',
            documentType: DocumentType.INVOICE,
            versionNumber: args.data.versionNumber ?? 1,
            storageBucket: 'nestlancer-pdfs',
            storageKey: 'invoices/p1/v2/NL-INV-2026-000001.pdf',
          }),
        ),
      },
    };

    pdfService = {
      generate: jest.fn().mockResolvedValue({
        buffer: Buffer.from('pdf'),
        filename: 'invoice.pdf',
        mimeType: 'application/pdf',
      }),
    };

    documentNumber = {
      assignNumber: jest.fn().mockImplementation((type: DocumentType) => {
        const prefix =
          type === DocumentType.QUOTE
            ? 'NL-QTE'
            : type === DocumentType.CONTRACT
              ? 'NL-CTR'
              : 'NL-INV';
        return `${prefix}-2026-000001`;
      }),
    };

    documentStorage = {
      getBucket: jest.fn().mockReturnValue('nestlancer-pdfs'),
      buildStorageKey: jest.fn().mockReturnValue('invoices/p1/v1/NL-INV-2026-000001.pdf'),
      upload: jest.fn().mockResolvedValue({ fileHash: 'hash-1', fileSize: 3 }),
      getDownloadUrl: jest.fn().mockResolvedValue('https://signed.example/invoice.pdf'),
    };

    service = new DocumentGenerationService(
      prismaRead,
      prismaWrite,
      pdfService as any,
      documentNumber as any,
      documentStorage,
    );
  });

  describe('generateAndStore', () => {
    it('generates, uploads, and registers a new document', async () => {
      const result = await service.generateAndStore({
        documentType: DocumentType.INVOICE,
        entityType: 'PAYMENT',
        entityId: 'pay-1',
        template: 'invoice',
        templateData: { invoiceNumber: 'INV-1' },
      });

      expect(pdfService.generate).toHaveBeenCalledWith({
        template: 'invoice',
        data: { invoiceNumber: 'NL-INV-2026-000001' },
      });
      expect(documentNumber.assignNumber).toHaveBeenCalledWith(DocumentType.INVOICE);
      expect(result.documentNumber).toBe('NL-INV-2026-000001');
      expect(result.versionNumber).toBe(1);
      expect(result.downloadUrl).toBe('https://signed.example/invoice.pdf');
    });

    it('injects assigned document number into template data when missing', async () => {
      await service.generateAndStore({
        documentType: DocumentType.QUOTE,
        entityType: 'QUOTE',
        entityId: 'q-1',
        template: 'quote',
        templateData: { projectTitle: 'Test project' },
      });

      expect(pdfService.generate).toHaveBeenCalledWith({
        template: 'quote',
        data: expect.objectContaining({ quoteNumber: 'NL-QTE-2026-000001' }),
      });
    });

    it('returns existing latest document without regenerating', async () => {
      prismaWrite.generatedDocument.findMany.mockResolvedValue([
        {
          ...latestDoc,
          metadata: { templateVersion: PDF_TEMPLATE_VERSION },
        },
      ]);

      const result = await service.generateAndStore({
        documentType: DocumentType.INVOICE,
        entityType: 'PAYMENT',
        entityId: 'pay-1',
        template: 'invoice',
        templateData: {},
      });

      expect(pdfService.generate).not.toHaveBeenCalled();
      expect(result.id).toBe('doc-1');
      expect(result.versionNumber).toBe(1);
    });

    it('returns existing immutable document without regenerating when template is current', async () => {
      prismaWrite.generatedDocument.findMany.mockResolvedValue([
        {
          ...latestDoc,
          isImmutable: true,
          metadata: { templateVersion: PDF_TEMPLATE_VERSION },
        },
      ]);

      const result = await service.generateAndStore({
        documentType: DocumentType.INVOICE,
        entityType: 'PAYMENT',
        entityId: 'pay-1',
        template: 'invoice',
        templateData: {},
      });

      expect(pdfService.generate).not.toHaveBeenCalled();
      expect(result.id).toBe('doc-1');
    });

    it('bumps a new version when forceNewVersion is set on an immutable document', async () => {
      const immutable = {
        ...latestDoc,
        isImmutable: true,
        metadata: { templateVersion: PDF_TEMPLATE_VERSION },
      };
      prismaWrite.generatedDocument.findMany.mockResolvedValue([immutable]);
      // Inside the write transaction the raced lookup sees the same latest row.
      tx.generatedDocument.findMany.mockResolvedValue([immutable]);
      documentStorage.buildStorageKey.mockReturnValue('invoices/p1/v2/NL-INV-2026-000001.pdf');

      const result = await service.generateAndStore({
        documentType: DocumentType.INVOICE,
        entityType: 'PAYMENT',
        entityId: 'pay-1',
        template: 'invoice',
        templateData: {},
        forceNewVersion: true,
      });

      expect(pdfService.generate).toHaveBeenCalled();
      expect(tx.$executeRaw).toHaveBeenCalled();
      expect(result.versionNumber).toBe(2);
    });

    it('refreshes immutable documents when PDF template version is stale', async () => {
      prismaWrite.generatedDocument.findMany.mockResolvedValue([
        {
          ...latestDoc,
          isImmutable: true,
          metadata: { templateVersion: 'legacy-v1' },
        },
      ]);
      documentStorage.buildStorageKey.mockReturnValue('invoices/p1/v2/NL-INV-2026-000001.pdf');

      const result = await service.generateAndStore({
        documentType: DocumentType.CONTRACT,
        entityType: 'QUOTE',
        entityId: 'quote-1',
        template: 'contract',
        templateData: { contractNumber: 'CTR-1' },
      });

      expect(pdfService.generate).toHaveBeenCalled();
      expect(prismaWrite.generatedDocument.update).toHaveBeenCalled();
      expect(result.versionNumber).toBe(2);
    });

    it('refreshes in place when PDF template version is stale', async () => {
      prismaWrite.generatedDocument.findMany.mockResolvedValue([
        {
          ...latestDoc,
          metadata: { templateVersion: 'legacy-v1' },
        },
      ]);
      documentStorage.buildStorageKey.mockReturnValue('invoices/p1/v2/NL-INV-2026-000001.pdf');

      const result = await service.generateAndStore({
        documentType: DocumentType.INVOICE,
        entityType: 'PAYMENT',
        entityId: 'pay-1',
        template: 'invoice',
        templateData: { invoiceNumber: 'INV-1' },
      });

      expect(pdfService.generate).toHaveBeenCalled();
      expect(prismaWrite.generatedDocument.update).toHaveBeenCalled();
      expect(result.versionNumber).toBe(2);
      expect(result.documentNumber).toBe('NL-INV-2026-000001');
    });

    it('reuses a concurrent writer result instead of minting a second latest invoice', async () => {
      const raced = {
        ...latestDoc,
        id: 'doc-raced',
        documentNumber: 'NL-INV-2026-000045',
        metadata: { templateVersion: PDF_TEMPLATE_VERSION },
        fileHash: 'raced-hash',
      };
      prismaWrite.generatedDocument.findMany.mockResolvedValue([]);
      tx.generatedDocument.findMany.mockResolvedValue([raced]);

      const result = await service.generateAndStore({
        documentType: DocumentType.INVOICE,
        entityType: 'PAYMENT',
        entityId: 'pay-1',
        template: 'invoice',
        templateData: {},
        changeReason: 'Invoice generated on download',
      });

      expect(pdfService.generate).toHaveBeenCalled();
      expect(tx.generatedDocument.create).not.toHaveBeenCalled();
      expect(result.id).toBe('doc-raced');
      expect(result.documentNumber).toBe('NL-INV-2026-000045');
    });

    it('prefers the payment canonical invoice over a newer orphan download number', async () => {
      const orphan = {
        ...latestDoc,
        id: 'doc-orphan',
        documentNumber: 'NL-INV-2026-000044',
        issuedAt: new Date('2026-09-29T00:08:56.492Z'),
        metadata: { templateVersion: PDF_TEMPLATE_VERSION },
        changeReason: 'Invoice generated on download',
      };
      const issued = {
        ...latestDoc,
        id: 'doc-issued',
        documentNumber: 'NL-INV-2026-000045',
        issuedAt: new Date('2026-09-29T00:08:52.185Z'),
        metadata: { templateVersion: PDF_TEMPLATE_VERSION },
        changeReason: 'Invoice issued',
      };
      // findMany ordered desc → orphan first; canonical pointer must still win.
      prismaWrite.generatedDocument.findMany.mockResolvedValue([orphan, issued]);
      prismaWrite.payment.findUnique.mockResolvedValue({
        currentInvoiceDocumentId: 'doc-issued',
        invoiceNumber: 'NL-INV-2026-000045',
        currentReceiptDocumentId: null,
        receiptNumber: null,
      });

      const result = await service.generateAndStore({
        documentType: DocumentType.INVOICE,
        entityType: 'PAYMENT',
        entityId: 'pay-1',
        template: 'invoice',
        templateData: {},
        changeReason: 'Invoice generated on download',
      });

      expect(pdfService.generate).not.toHaveBeenCalled();
      expect(result.id).toBe('doc-issued');
      expect(result.documentNumber).toBe('NL-INV-2026-000045');
      expect(prismaWrite.generatedDocument.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'doc-orphan' },
          data: expect.objectContaining({ isLatest: false, status: DocumentStatus.SUPERSEDED }),
        }),
      );
    });
  });

  describe('storeBinary', () => {
    it('refreshes export binary in place when a latest document already exists', async () => {
      prismaRead.generatedDocument.findFirst.mockResolvedValue({
        ...latestDoc,
        documentType: DocumentType.EXPORT_PROJECT,
        documentNumber: 'NL-EXP-PRJ-2026-000001',
        storageKey: 'exports/projects/p1/v1/NL-EXP-PRJ-2026-000001.zip',
      });
      documentStorage.buildStorageKey.mockReturnValue(
        'exports/projects/p1/v2/NL-EXP-PRJ-2026-000001.zip',
      );

      prismaWrite.generatedDocument.update.mockImplementation(
        (args: { data: { versionNumber?: number } }) =>
          Promise.resolve({
            id: 'doc-export-1',
            documentNumber: 'NL-EXP-PRJ-2026-000001',
            documentType: DocumentType.EXPORT_PROJECT,
            versionNumber: args.data.versionNumber ?? 2,
            storageBucket: 'nestlancer-private',
            storageKey: 'exports/projects/p1/v2/NL-EXP-PRJ-2026-000001.zip',
          }),
      );

      const result = await service.storeBinary({
        documentType: DocumentType.EXPORT_PROJECT,
        entityType: 'PROJECT',
        entityId: 'p1',
        buffer: Buffer.from('zip'),
        mimeType: 'application/zip',
        extension: 'zip',
      });

      expect(prismaWrite.generatedDocument.update).toHaveBeenCalled();
      expect(tx.generatedDocument.create).not.toHaveBeenCalled();
      expect(result.versionNumber).toBe(2);
      expect(result.documentNumber).toBe('NL-EXP-PRJ-2026-000001');
    });
  });

  describe('listVersions', () => {
    it('returns version history with download URLs', async () => {
      const versions = await service.listVersions('PAYMENT', 'pay-1', DocumentType.INVOICE);

      expect(versions).toHaveLength(1);
      expect(versions[0].documentNumber).toBe('NL-INV-2026-000001');
      expect(versions[0].downloadUrl).toBe('https://signed.example/invoice.pdf');
    });
  });

  describe('verifyDocument', () => {
    it('returns verification metadata for known document number', async () => {
      const result = await service.verifyDocument('NL-INV-2026-000001');

      expect(result).toEqual(
        expect.objectContaining({
          documentNumber: 'NL-INV-2026-000001',
          type: DocumentType.INVOICE,
          version: 1,
          status: 'VALID',
          isLatest: true,
        }),
      );
    });

    it('returns null for unknown document number', async () => {
      prismaRead.generatedDocument.findUnique.mockResolvedValue(null);
      prismaRead.payment.findFirst.mockResolvedValue(null);
      await expect(service.verifyDocument('NL-INV-2099-999999')).resolves.toBeNull();
    });

    it('resolves legacy INV-NL numbers via payment linked registry doc', async () => {
      prismaRead.generatedDocument.findUnique
        .mockResolvedValueOnce(null) // candidates miss on registry
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(latestDoc); // linked doc lookup
      prismaRead.payment.findFirst.mockResolvedValue({
        id: 'pay-1',
        invoiceNumber: 'INV-NL-2026-0002',
        receiptNumber: null,
        paidAt: new Date('2026-06-08T10:00:00Z'),
        createdAt: new Date('2026-06-08T10:00:00Z'),
        currentInvoiceDocumentId: 'doc-1',
        currentReceiptDocumentId: null,
      });

      const result = await service.verifyDocument('INV-NL-2026-0002');
      expect(result).toEqual(
        expect.objectContaining({
          documentNumber: 'NL-INV-2026-000001',
          status: 'VALID',
        }),
      );
    });
  });
});
