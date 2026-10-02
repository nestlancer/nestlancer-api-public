import { Injectable, Logger } from '@nestjs/common';
import { DocumentStatus, DocumentType, Prisma } from '@prisma/client';
import {
  pickDepositIdFromContext,
  resolveMilestoneClientAccess,
  type PaymentSnapshot,
} from '@nestlancer/common';
import { PrismaReadService, PrismaWriteService } from '@nestlancer/database';
import { PdfService, PDF_TEMPLATE_VERSION, isPdfTemplateStale } from '@nestlancer/pdf';
import { DocumentNumberService } from './document-number.service';
import { DocumentStorageService } from './document-storage.service';
import {
  GenerateDocumentOptions,
  GeneratedDocumentResult,
  DocumentVersionInfo,
  DocumentDownloadResult,
} from './interfaces/document.interface';
import { expandDocumentNumberCandidates } from './document-number-aliases';

/** Template data keys populated from assigned document numbers before PDF render. */
const DOCUMENT_NUMBER_TEMPLATE_FIELDS: Partial<Record<DocumentType, string>> = {
  QUOTE: 'quoteNumber',
  CONTRACT: 'contractNumber',
  INVOICE: 'invoiceNumber',
  RECEIPT: 'receiptNumber',
  REMINDER: 'reminderNumber',
};

@Injectable()
export class DocumentGenerationService {
  private readonly logger = new Logger(DocumentGenerationService.name);

  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly prismaWrite: PrismaWriteService,
    private readonly pdfService: PdfService,
    private readonly documentNumber: DocumentNumberService,
    private readonly documentStorage: DocumentStorageService,
  ) {}

  async generateAndStore(options: GenerateDocumentOptions): Promise<GeneratedDocumentResult> {
    const latestWhere = {
      documentType: options.documentType,
      entityType: options.entityType,
      entityId: options.entityId,
      isLatest: true,
    };

    // NL-BUG-DOC-001: write-connection lookup; prefer payment canonical pointer when
    // download+worker left multiple isLatest rows (newest issuedAt is often the orphan).
    const existingLatest = await this.findCanonicalLatestDocument(latestWhere);

    const templateStale = existingLatest ? isPdfTemplateStale(existingLatest.metadata) : false;
    const repairImmutable = Boolean(
      existingLatest?.isImmutable && options.repairImmutableTemplate && templateStale,
    );

    // QUOTE-003: honor forceNewVersion even for immutable docs (admin regenerate /
    // explicit version bump). Immutable early-return previously ignored that flag.
    if (
      existingLatest?.isImmutable &&
      !repairImmutable &&
      !templateStale &&
      !options.forceNewVersion
    ) {
      await this.healDuplicateLatestDocuments(existingLatest.id, latestWhere);
      const downloadUrl = await this.documentStorage.getDownloadUrl(
        existingLatest.storageBucket,
        existingLatest.storageKey,
      );
      return {
        id: existingLatest.id,
        documentNumber: existingLatest.documentNumber,
        documentType: existingLatest.documentType,
        versionNumber: existingLatest.versionNumber,
        storageBucket: existingLatest.storageBucket,
        storageKey: existingLatest.storageKey,
        downloadUrl,
        fileHash: existingLatest.fileHash || '',
        isLatest: true,
      };
    }

    if (existingLatest && !options.forceNewVersion && !templateStale && !repairImmutable) {
      await this.healDuplicateLatestDocuments(existingLatest.id, latestWhere);
      const downloadUrl = await this.documentStorage.getDownloadUrl(
        existingLatest.storageBucket,
        existingLatest.storageKey,
      );
      return {
        id: existingLatest.id,
        documentNumber: existingLatest.documentNumber,
        documentType: existingLatest.documentType,
        versionNumber: existingLatest.versionNumber,
        storageBucket: existingLatest.storageBucket,
        storageKey: existingLatest.storageKey,
        downloadUrl,
        fileHash: existingLatest.fileHash || '',
        isLatest: true,
      };
    }

    if (templateStale && existingLatest) {
      return this.refreshDocumentContent(existingLatest, options);
    }

    const previousVersionHint = existingLatest;
    const reservedDocumentNumber =
      previousVersionHint?.documentNumber ??
      (await this.documentNumber.assignNumber(options.documentType));

    const pdfResult = await this.pdfService.generate({
      template: options.template,
      data: this.enrichTemplateDataWithDocumentNumber(
        options.documentType,
        options.templateData,
        reservedDocumentNumber,
      ),
    });

    return this.prismaWrite.$transaction(async (tx) => {
      // Hold the lock only for the short DB write path (PDF already rendered).
      await tx.$executeRaw`
        SELECT pg_advisory_xact_lock(
          hashtext(${`${options.documentType}:${options.entityType}:${options.entityId}`})
        )
      `;

      const racedLatest = await this.findCanonicalLatestDocument(latestWhere, tx);

      if (racedLatest) {
        const racedStale = isPdfTemplateStale(racedLatest.metadata);
        const racedRepair = Boolean(
          racedLatest.isImmutable && options.repairImmutableTemplate && racedStale,
        );
        // Another writer finished while we rendered — reuse unless we must version/refresh.
        if (!options.forceNewVersion && !racedStale && !racedRepair) {
          await this.healDuplicateLatestDocuments(racedLatest.id, latestWhere, tx);
          const downloadUrl = await this.documentStorage.getDownloadUrl(
            racedLatest.storageBucket,
            racedLatest.storageKey,
          );
          this.logger.log(
            `Reusing ${options.documentType} ${racedLatest.documentNumber} for ${options.entityType}/${options.entityId} (concurrent writer won)`,
          );
          return {
            id: racedLatest.id,
            documentNumber: racedLatest.documentNumber,
            documentType: racedLatest.documentType,
            versionNumber: racedLatest.versionNumber,
            storageBucket: racedLatest.storageBucket,
            storageKey: racedLatest.storageKey,
            downloadUrl,
            fileHash: racedLatest.fileHash || '',
            isLatest: true,
          };
        }
      }

      const previousVersion = racedLatest ?? previousVersionHint;
      let documentNumber = previousVersion?.documentNumber ?? reservedDocumentNumber;
      let versionNumber = 1;

      if (previousVersion) {
        versionNumber = previousVersion.versionNumber + 1;
        documentNumber = previousVersion.documentNumber;
        // documentNumber is globally unique. Archive the previous row's number so
        // the canonical NL-* number can move to the new latest version (regeneration
        // otherwise 500s on the unique constraint after the PDF is rendered).
        await tx.generatedDocument.update({
          where: { id: previousVersion.id },
          data: {
            isLatest: false,
            status: DocumentStatus.SUPERSEDED,
            documentNumber: `${previousVersion.documentNumber}#v${previousVersion.versionNumber}`,
          },
        });
      }

      const bucket = this.documentStorage.getBucket(options.documentType);
      const storageKey = this.documentStorage.buildStorageKey(
        options.documentType,
        options.entityId,
        versionNumber,
        documentNumber!,
        pdfResult.mimeType === 'application/pdf' ? 'pdf' : 'html',
        options.issuedToUserId,
      );

      const { fileHash, fileSize } = await this.documentStorage.upload(
        bucket,
        storageKey,
        pdfResult.buffer,
        pdfResult.mimeType,
        { documentNumber: documentNumber!, version: String(versionNumber) },
      );

      const doc = await tx.generatedDocument.create({
        data: {
          documentNumber: documentNumber!,
          documentType: options.documentType,
          entityType: options.entityType,
          entityId: options.entityId,
          versionNumber,
          isLatest: true,
          isImmutable: options.isImmutable ?? false,
          fileHash,
          storageBucket: bucket,
          storageKey,
          mimeType: pdfResult.mimeType,
          fileSize,
          issuedToUserId: options.issuedToUserId,
          triggeredByEvent: options.triggeredByEvent,
          triggeredByUserId: options.triggeredByUserId,
          changeReason: options.changeReason,
          metadata: {
            templateVersion: PDF_TEMPLATE_VERSION,
            ...(options.metadata ?? {}),
          } as Prisma.InputJsonValue,
          status: DocumentStatus.GENERATED,
          previousVersionId: previousVersion?.id,
        },
      });

      if (previousVersion) {
        await tx.generatedDocument.update({
          where: { id: previousVersion.id },
          data: { supersededById: doc.id },
        });
      }

      await this.healDuplicateLatestDocuments(doc.id, latestWhere, tx);

      const downloadUrl = await this.documentStorage.getDownloadUrl(bucket, storageKey);

      this.logger.log(
        `Generated ${options.documentType} ${documentNumber} v${versionNumber} for ${options.entityType}/${options.entityId}`,
      );

      return {
        id: doc.id,
        documentNumber: doc.documentNumber,
        documentType: doc.documentType,
        versionNumber: doc.versionNumber,
        storageBucket: doc.storageBucket,
        storageKey: doc.storageKey,
        downloadUrl,
        fileHash,
        isLatest: true,
      };
    });
  }

  /**
   * Pick the canonical isLatest row. For payment invoice/receipt docs, prefer the
   * payment.current*DocumentId / registry number over newest issuedAt (orphan downloads
   * often win a naive issuedAt sort — see NL-BUG-DOC-001).
   */
  private async findCanonicalLatestDocument(
    latestWhere: {
      documentType: DocumentType;
      entityType: string;
      entityId: string;
      isLatest: boolean;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const db = tx ?? this.prismaWrite;
    const candidates = await db.generatedDocument.findMany({
      where: latestWhere,
      orderBy: { issuedAt: 'desc' },
    });
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0]!;

    const dtype = String(latestWhere.documentType).toUpperCase();
    const etype = String(latestWhere.entityType).toUpperCase();
    if (etype === 'PAYMENT' && (dtype === 'INVOICE' || dtype === 'RECEIPT')) {
      const payment = await db.payment.findUnique({
        where: { id: latestWhere.entityId },
        select: {
          currentInvoiceDocumentId: true,
          invoiceNumber: true,
          currentReceiptDocumentId: true,
          receiptNumber: true,
        },
      });
      const preferredId =
        dtype === 'INVOICE' ? payment?.currentInvoiceDocumentId : payment?.currentReceiptDocumentId;
      const preferredNumber =
        dtype === 'INVOICE' ? payment?.invoiceNumber : payment?.receiptNumber;
      const byId = preferredId ? candidates.find((c) => c.id === preferredId) : undefined;
      if (byId) return byId;
      const byNumber = preferredNumber
        ? candidates.find((c) => c.documentNumber === preferredNumber)
        : undefined;
      if (byNumber) return byNumber;
    }

    return candidates[0]!;
  }

  /**
   * NL-BUG-DOC-001: collapse zombie isLatest siblings (e.g. download minted 000044
   * while worker minted 000045 for the same payment). Keeps `winnerId` as latest.
   */
  private async healDuplicateLatestDocuments(
    winnerId: string,
    latestWhere: {
      documentType: DocumentType;
      entityType: string;
      entityId: string;
      isLatest: boolean;
    },
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const db = tx ?? this.prismaWrite;
    const zombies = await db.generatedDocument.findMany({
      where: {
        ...latestWhere,
        id: { not: winnerId },
      },
      select: { id: true, documentNumber: true, versionNumber: true },
    });
    for (const zombie of zombies) {
      await db.generatedDocument.update({
        where: { id: zombie.id },
        data: {
          isLatest: false,
          status: DocumentStatus.SUPERSEDED,
          documentNumber: `${zombie.documentNumber}#orphan-v${zombie.versionNumber}`,
          supersededById: winnerId,
        },
      });
      this.logger.warn(
        `Superseded duplicate latest ${zombie.documentNumber} → ${winnerId} for ${latestWhere.documentType}/${latestWhere.entityType}/${latestWhere.entityId}`,
      );
    }
  }

  /** Re-render PDF in place when layout template version changes (keeps same documentNumber). */
  private async refreshDocumentContent(
    existing: {
      id: string;
      documentNumber: string;
      documentType: DocumentType;
      versionNumber: number;
      storageBucket: string;
      storageKey: string;
      fileHash: string | null;
      issuedToUserId?: string | null;
    },
    options: GenerateDocumentOptions,
  ): Promise<GeneratedDocumentResult> {
    this.logger.log(
      `Refreshing stale ${options.documentType} ${existing.documentNumber} for ${options.entityType}/${options.entityId} → template ${PDF_TEMPLATE_VERSION}`,
    );

    const pdfResult = await this.pdfService.generate({
      template: options.template,
      data: this.enrichTemplateDataWithDocumentNumber(
        options.documentType,
        options.templateData,
        existing.documentNumber,
      ),
    });

    const versionNumber = existing.versionNumber + 1;
    const bucket = this.documentStorage.getBucket(options.documentType);
    const storageKey = this.documentStorage.buildStorageKey(
      options.documentType,
      options.entityId,
      versionNumber,
      existing.documentNumber,
      pdfResult.mimeType === 'application/pdf' ? 'pdf' : 'html',
      options.issuedToUserId ?? existing.issuedToUserId,
    );

    const { fileHash, fileSize } = await this.documentStorage.upload(
      bucket,
      storageKey,
      pdfResult.buffer,
      pdfResult.mimeType,
      { documentNumber: existing.documentNumber, version: String(versionNumber) },
    );

    const doc = await this.prismaWrite.generatedDocument.update({
      where: { id: existing.id },
      data: {
        versionNumber,
        storageBucket: bucket,
        storageKey,
        fileHash,
        fileSize,
        mimeType: pdfResult.mimeType,
        changeReason: options.changeReason ?? 'PDF template refresh',
        triggeredByEvent: options.triggeredByEvent,
        triggeredByUserId: options.triggeredByUserId,
        metadata: {
          templateVersion: PDF_TEMPLATE_VERSION,
          ...(options.metadata ?? {}),
        } as Prisma.InputJsonValue,
        status: DocumentStatus.GENERATED,
      },
    });

    const downloadUrl = await this.documentStorage.getDownloadUrl(bucket, storageKey);

    return {
      id: doc.id,
      documentNumber: doc.documentNumber,
      documentType: doc.documentType,
      versionNumber: doc.versionNumber,
      storageBucket: doc.storageBucket,
      storageKey: doc.storageKey,
      downloadUrl,
      fileHash: fileHash || '',
      isLatest: true,
    };
  }

  async storeBinary(
    options: Omit<GenerateDocumentOptions, 'template' | 'templateData'> & {
      buffer: Buffer;
      mimeType: string;
      extension: string;
    },
  ): Promise<GeneratedDocumentResult> {
    const existingLatest = await this.prismaRead.generatedDocument.findFirst({
      where: {
        documentType: options.documentType,
        entityType: options.entityType,
        entityId: options.entityId,
        isLatest: true,
      },
    });

    if (existingLatest) {
      return this.refreshBinaryContent(existingLatest, options);
    }

    return this.prismaWrite.$transaction(async (tx) => {
      const documentNumber = await this.documentNumber.assignNumber(options.documentType, tx);
      const versionNumber = 1;

      const bucket = this.documentStorage.getBucket(options.documentType);
      const storageKey = this.documentStorage.buildStorageKey(
        options.documentType,
        options.entityId,
        versionNumber,
        documentNumber,
        options.extension,
        options.issuedToUserId,
      );

      const { fileHash, fileSize } = await this.documentStorage.upload(
        bucket,
        storageKey,
        options.buffer,
        options.mimeType,
      );

      const doc = await tx.generatedDocument.create({
        data: {
          documentNumber,
          documentType: options.documentType,
          entityType: options.entityType,
          entityId: options.entityId,
          versionNumber,
          isLatest: true,
          isImmutable: options.isImmutable ?? false,
          fileHash,
          storageBucket: bucket,
          storageKey,
          mimeType: options.mimeType,
          fileSize,
          issuedToUserId: options.issuedToUserId,
          triggeredByEvent: options.triggeredByEvent,
          changeReason: options.changeReason,
          metadata: (options.metadata as Prisma.InputJsonValue) ?? undefined,
          status: DocumentStatus.GENERATED,
        },
      });

      const downloadUrl = await this.documentStorage.getDownloadUrl(bucket, storageKey);

      return {
        id: doc.id,
        documentNumber: doc.documentNumber,
        documentType: doc.documentType,
        versionNumber: doc.versionNumber,
        storageBucket: doc.storageBucket,
        storageKey: doc.storageKey,
        downloadUrl,
        fileHash,
        isLatest: true,
      };
    });
  }

  /** Replace binary export content in place (documentNumber is globally unique). */
  private async refreshBinaryContent(
    existing: {
      id: string;
      documentNumber: string;
      documentType: DocumentType;
      versionNumber: number;
      storageBucket: string;
      storageKey: string;
      issuedToUserId?: string | null;
    },
    options: Omit<GenerateDocumentOptions, 'template' | 'templateData'> & {
      buffer: Buffer;
      mimeType: string;
      extension: string;
    },
  ): Promise<GeneratedDocumentResult> {
    const versionNumber = existing.versionNumber + 1;
    const bucket = this.documentStorage.getBucket(options.documentType);
    const storageKey = this.documentStorage.buildStorageKey(
      options.documentType,
      options.entityId,
      versionNumber,
      existing.documentNumber,
      options.extension,
      options.issuedToUserId ?? existing.issuedToUserId,
    );

    const { fileHash, fileSize } = await this.documentStorage.upload(
      bucket,
      storageKey,
      options.buffer,
      options.mimeType,
      { documentNumber: existing.documentNumber, version: String(versionNumber) },
    );

    const doc = await this.prismaWrite.generatedDocument.update({
      where: { id: existing.id },
      data: {
        versionNumber,
        storageBucket: bucket,
        storageKey,
        fileHash,
        fileSize,
        mimeType: options.mimeType,
        changeReason: options.changeReason,
        triggeredByEvent: options.triggeredByEvent,
        triggeredByUserId: options.triggeredByUserId,
        metadata: (options.metadata as Prisma.InputJsonValue) ?? undefined,
        status: DocumentStatus.GENERATED,
      },
    });

    const downloadUrl = await this.documentStorage.getDownloadUrl(bucket, storageKey);

    return {
      id: doc.id,
      documentNumber: doc.documentNumber,
      documentType: doc.documentType,
      versionNumber: doc.versionNumber,
      storageBucket: doc.storageBucket,
      storageKey: doc.storageKey,
      downloadUrl,
      fileHash: fileHash || '',
      isLatest: true,
    };
  }

  private enrichTemplateDataWithDocumentNumber(
    documentType: DocumentType,
    templateData: Record<string, unknown>,
    documentNumber: string,
  ): Record<string, unknown> {
    const field = DOCUMENT_NUMBER_TEMPLATE_FIELDS[documentType];
    if (!field) {
      return templateData;
    }
    // Always print the registry/canonical number on the PDF. Legacy payment fields
    // (INV-NL-*) must not override NL-INV-* or public verify will fail for the printed No.
    const enriched: Record<string, unknown> = { ...templateData, [field]: documentNumber };

    // NL-BUG-PAY-008: paymentContext is built before the registry number exists, so
    // schedule/history rows would otherwise print bank UTR in the invoice/receipt columns.
    const ctx = enriched.paymentContext;
    if (ctx && typeof ctx === 'object') {
      const paymentContext = { ...(ctx as Record<string, unknown>) };
      paymentContext[field] = documentNumber;

      const patchRows = (rows: unknown): unknown => {
        if (!Array.isArray(rows)) return rows;
        return rows.map((row) => {
          if (!row || typeof row !== 'object') return row;
          const next = { ...(row as Record<string, unknown>) };
          if (next.isCurrent === true || !next[field]) {
            next[field] = documentNumber;
          }
          return next;
        });
      };

      paymentContext.paymentSchedule = patchRows(paymentContext.paymentSchedule);
      paymentContext.transactionHistory = patchRows(paymentContext.transactionHistory);
      enriched.paymentContext = paymentContext;
    }

    return enriched;
  }

  async getLatestDocument(
    documentType: DocumentType,
    entityType: string,
    entityId: string,
  ): Promise<GeneratedDocumentResult | null> {
    const doc = await this.findCanonicalLatestDocument({
      documentType,
      entityType,
      entityId,
      isLatest: true,
    });
    if (!doc) return null;

    const downloadUrl = await this.documentStorage.getDownloadUrl(
      doc.storageBucket,
      doc.storageKey,
    );
    return {
      id: doc.id,
      documentNumber: doc.documentNumber,
      documentType: doc.documentType,
      versionNumber: doc.versionNumber,
      storageBucket: doc.storageBucket,
      storageKey: doc.storageKey,
      downloadUrl,
      fileHash: doc.fileHash || '',
      isLatest: doc.isLatest,
    };
  }

  async listVersions(
    entityType: string,
    entityId: string,
    documentType?: DocumentType,
  ): Promise<DocumentVersionInfo[]> {
    const docs = await this.prismaRead.generatedDocument.findMany({
      where: {
        entityType,
        entityId,
        ...(documentType ? { documentType } : {}),
      },
      orderBy: [{ documentType: 'asc' }, { versionNumber: 'desc' }],
    });

    return Promise.all(
      docs.map(async (doc) => {
        const downloadUrl = await this.documentStorage.getDownloadUrl(
          doc.storageBucket,
          doc.storageKey,
        );
        return {
          id: doc.id,
          documentNumber: doc.documentNumber,
          versionNumber: doc.versionNumber,
          documentType: doc.documentType,
          issuedAt: doc.issuedAt,
          changeReason: doc.changeReason,
          isLatest: doc.isLatest,
          isImmutable: doc.isImmutable,
          downloadUrl,
        };
      }),
    );
  }

  /** User-facing version list — metadata only; downloads use entity-specific latest endpoints. */
  async listVersionsForUser(
    entityType: string,
    entityId: string,
    documentType?: DocumentType,
  ): Promise<DocumentVersionInfo[]> {
    const versions = await this.listVersions(entityType, entityId, documentType);
    return versions
      .filter((doc) => doc.isLatest)
      .map(({ downloadUrl: _downloadUrl, ...doc }) => doc);
  }

  /** List generated documents issued to a user account (own storage). */
  async listIssuedToUser(
    userId: string,
    options?: { latestOnly?: boolean; limit?: number; page?: number },
  ) {
    // NL-BUG-DOCS-001: paginate like /invoices (MAX_LIMIT=100). Callers that omit
    // page get page 1; raise via ?page= to reach older invoices beyond the window.
    const page = Math.max(1, Number(options?.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options?.limit) || 20));
    const skip = (page - 1) * limit;
    const where = {
      issuedToUserId: userId,
      status: { in: [DocumentStatus.GENERATED, DocumentStatus.SUPERSEDED] },
      ...(options?.latestOnly === false ? {} : { isLatest: true }),
    };

    // NL-PAY-011: load candidates then apply the same invoice visibility gate as /invoices.
    const candidates = await this.prismaRead.generatedDocument.findMany({
      where,
      orderBy: { issuedAt: 'desc' },
      select: {
        id: true,
        documentNumber: true,
        documentType: true,
        versionNumber: true,
        isLatest: true,
        isImmutable: true,
        mimeType: true,
        fileSize: true,
        issuedAt: true,
        entityType: true,
        entityId: true,
        status: true,
        changeReason: true,
      },
    });

    // Visibility does not need request titles, and titles do not need the
    // invoice gate. Run them together so the files page is not two serial stages.
    const [withContext, visible] = await Promise.all([
      this.attachRequestContext(candidates),
      this.filterClientVisibleDocuments(userId, candidates),
    ]);
    const contextById = new Map(withContext.map((row) => [row.id, row]));
    const visibleWithContext = visible.map((row) => contextById.get(row.id) ?? row);
    // NL-BUG-DOC-001 / NL-PAY-011: when download+worker both left isLatest rows,
    // prefer the payment's canonical document so Files matches /invoices.
    const aligned =
      options?.latestOnly === false
        ? visibleWithContext
        : await this.preferCanonicalPaymentDocuments(userId, visibleWithContext);
    const total = aligned.length;
    const data = aligned.slice(skip, skip + limit);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit) || 1),
      },
    };
  }

  /**
   * NL-BUG-DOC-001: one payment can temporarily have multiple isLatest invoice/receipt
   * rows. Prefer payment.current*DocumentId / canonical number so Files matches /invoices.
   */
  private async preferCanonicalPaymentDocuments<
    T extends {
      id: string;
      documentType: string;
      entityType: string;
      entityId: string;
      documentNumber?: string | null;
      issuedAt?: Date | string | null;
    },
  >(userId: string, items: T[]): Promise<T[]> {
    const paymentEntityIds = [
      ...new Set(
        items
          .filter((item) => {
            const dtype = String(item.documentType).toUpperCase();
            return (
              (dtype === 'INVOICE' || dtype === 'RECEIPT') &&
              String(item.entityType).toUpperCase() === 'PAYMENT' &&
              item.entityId
            );
          })
          .map((item) => item.entityId),
      ),
    ];
    if (paymentEntityIds.length === 0) return items;

    const payments = await this.prismaRead.payment.findMany({
      where: { id: { in: paymentEntityIds }, clientId: userId },
      select: {
        id: true,
        currentInvoiceDocumentId: true,
        invoiceNumber: true,
        currentReceiptDocumentId: true,
        receiptNumber: true,
      },
    });
    const paymentById = new Map(payments.map((p) => [p.id, p]));

    const groups = new Map<string, T[]>();
    const others: T[] = [];
    for (const item of items) {
      const dtype = String(item.documentType).toUpperCase();
      const etype = String(item.entityType).toUpperCase();
      if ((dtype === 'INVOICE' || dtype === 'RECEIPT') && etype === 'PAYMENT' && item.entityId) {
        const key = `${dtype}:${item.entityId}`;
        const list = groups.get(key) ?? [];
        list.push(item);
        groups.set(key, list);
        continue;
      }
      others.push(item);
    }

    const picked: T[] = [];
    for (const [key, group] of groups) {
      if (group.length === 1) {
        picked.push(group[0]!);
        continue;
      }
      const dtype = key.split(':')[0]!;
      const payment = paymentById.get(group[0]!.entityId);
      const preferredId =
        dtype === 'INVOICE' ? payment?.currentInvoiceDocumentId : payment?.currentReceiptDocumentId;
      const preferredNumber =
        dtype === 'INVOICE' ? payment?.invoiceNumber : payment?.receiptNumber;
      const byId = preferredId ? group.find((g) => g.id === preferredId) : undefined;
      const byNumber = preferredNumber
        ? group.find((g) => g.documentNumber === preferredNumber)
        : undefined;
      const fallback = [...group].sort((a, b) => {
        const ta = a.issuedAt ? new Date(a.issuedAt).getTime() : 0;
        const tb = b.issuedAt ? new Date(b.issuedAt).getTime() : 0;
        return tb - ta;
      })[0]!;
      picked.push(byId ?? byNumber ?? fallback);
    }

    return [...others, ...picked].sort((a, b) => {
      const ta = a.issuedAt ? new Date(a.issuedAt).getTime() : 0;
      const tb = b.issuedAt ? new Date(b.issuedAt).getTime() : 0;
      return tb - ta;
    });
  }

  /**
   * NL-PAY-011 / NL-PAY-010: hide CREATED/not-due invoice PDFs from Generated documents
   * using the same due/paid visibility rules as GET /invoices.
   * NL-QUOTE-006: hide quote PDFs while the quote is still DRAFT/PENDING.
   */
  private async filterClientVisibleDocuments<
    T extends { documentType: string; entityType: string; entityId: string },
  >(userId: string, items: T[]): Promise<T[]> {
    const invoicePaymentIds = [
      ...new Set(
        items
          .filter(
            (item) =>
              String(item.documentType).toUpperCase() === 'INVOICE' &&
              String(item.entityType).toUpperCase() === 'PAYMENT' &&
              item.entityId,
          )
          .map((item) => item.entityId),
      ),
    ];
    const draftQuoteIds = [
      ...new Set(
        items
          .filter(
            (item) =>
              String(item.documentType).toUpperCase() === 'QUOTE' &&
              String(item.entityType).toUpperCase() === 'QUOTE' &&
              item.entityId,
          )
          .map((item) => item.entityId),
      ),
    ];
    const draftQuotes =
      draftQuoteIds.length > 0
        ? await this.prismaRead.quote.findMany({
            where: {
              id: { in: draftQuoteIds },
              userId,
              status: { in: ['DRAFT', 'PENDING'] },
            },
            select: { id: true },
          })
        : [];
    const hiddenQuoteIds = new Set(draftQuotes.map((q) => q.id));

    if (invoicePaymentIds.length === 0) {
      return items.filter((item) => {
        if (String(item.documentType).toUpperCase() === 'INVOICE') return false;
        if (
          String(item.documentType).toUpperCase() === 'QUOTE' &&
          String(item.entityType).toUpperCase() === 'QUOTE'
        ) {
          return !hiddenQuoteIds.has(item.entityId);
        }
        return true;
      });
    }

    const payments = await this.prismaRead.payment.findMany({
      where: { id: { in: invoicePaymentIds }, clientId: userId },
      select: {
        id: true,
        status: true,
        projectId: true,
        milestoneId: true,
        paymentRequestedAt: true,
      },
    });

    const projectIds = [...new Set(payments.map((p) => p.projectId).filter(Boolean))];
    const [milestones, projectPayments] = await Promise.all([
      projectIds.length
        ? this.prismaRead.milestone.findMany({
            where: { projectId: { in: projectIds } },
            select: {
              id: true,
              projectId: true,
              order: true,
              createdAt: true,
              name: true,
              status: true,
            },
            orderBy: { order: 'asc' },
          })
        : Promise.resolve([]),
      projectIds.length
        ? this.prismaRead.payment.findMany({
            where: { projectId: { in: projectIds }, clientId: userId },
            select: {
              projectId: true,
              milestoneId: true,
              status: true,
              paymentRequestedAt: true,
            },
            orderBy: { createdAt: 'desc' },
          })
        : Promise.resolve([]),
    ]);

    const milestonesByProject = new Map<string, typeof milestones>();
    for (const m of milestones) {
      const list = milestonesByProject.get(m.projectId) ?? [];
      list.push(m);
      milestonesByProject.set(m.projectId, list);
    }

    const paymentsByProject = new Map<string, PaymentSnapshot[]>();
    for (const p of projectPayments) {
      if (!p.milestoneId) continue;
      const list = paymentsByProject.get(p.projectId) ?? [];
      list.push({
        milestoneId: p.milestoneId,
        status: p.status,
        paymentRequestedAt: p.paymentRequestedAt,
      });
      paymentsByProject.set(p.projectId, list);
    }

    const openStatuses = new Set([
      'CREATED',
      'PENDING',
      'PROCESSING',
      'PENDING_VERIFICATION',
      'FAILED',
    ]);
    const alwaysVisible = new Set([
      'COMPLETED',
      'REFUNDED',
      'DISPUTED',
      'PENDING_VERIFICATION',
      'PROCESSING',
    ]);

    const visiblePaymentIds = new Set<string>();
    for (const payment of payments) {
      const status = String(payment.status || '').toUpperCase();
      if (alwaysVisible.has(status)) {
        visiblePaymentIds.add(payment.id);
        continue;
      }
      if (!openStatuses.has(status)) continue;
      if (!payment.milestoneId) {
        visiblePaymentIds.add(payment.id);
        continue;
      }
      const projectMilestones = milestonesByProject.get(payment.projectId) ?? [];
      const snapshots = paymentsByProject.get(payment.projectId) ?? [];
      const depositId = pickDepositIdFromContext(projectMilestones, snapshots);
      const access = resolveMilestoneClientAccess(
        payment.milestoneId,
        projectMilestones,
        snapshots,
        depositId,
      );
      if (access.canPay) visiblePaymentIds.add(payment.id);
    }

    return items.filter((item) => {
      if (String(item.documentType).toUpperCase() === 'INVOICE') {
        if (String(item.entityType).toUpperCase() !== 'PAYMENT') return false;
        return visiblePaymentIds.has(item.entityId);
      }
      if (
        String(item.documentType).toUpperCase() === 'QUOTE' &&
        String(item.entityType).toUpperCase() === 'QUOTE'
      ) {
        return !hiddenQuoteIds.has(item.entityId);
      }
      return true;
    });
  }

  /**
   * Resolve request (and optional project) for docs issued under
   * quote → project → payment chains so UIs can group by request.
   */
  private async attachRequestContext<
    T extends { entityType: string; entityId: string },
  >(items: T[]) {
    if (items.length === 0) return [];

    const quoteIds = new Set<string>();
    const paymentIds = new Set<string>();
    const projectIds = new Set<string>();

    for (const item of items) {
      if (!item.entityId) continue;
      if (item.entityType === 'QUOTE') quoteIds.add(item.entityId);
      else if (item.entityType === 'PAYMENT') paymentIds.add(item.entityId);
      else if (item.entityType === 'PROJECT') projectIds.add(item.entityId);
    }

    const [quotes, payments, projects] = await Promise.all([
      quoteIds.size
        ? this.prismaRead.quote.findMany({
            where: { id: { in: [...quoteIds] } },
            select: {
              id: true,
              title: true,
              requestId: true,
              request: { select: { id: true, title: true } },
              project: { select: { id: true, title: true } },
            },
          })
        : Promise.resolve([]),
      paymentIds.size
        ? this.prismaRead.payment.findMany({
            where: { id: { in: [...paymentIds] } },
            select: {
              id: true,
              projectId: true,
              project: {
                select: {
                  id: true,
                  title: true,
                  quote: {
                    select: {
                      requestId: true,
                      request: { select: { id: true, title: true } },
                    },
                  },
                },
              },
            },
          })
        : Promise.resolve([]),
      projectIds.size
        ? this.prismaRead.project.findMany({
            where: { id: { in: [...projectIds] } },
            select: {
              id: true,
              title: true,
              quote: {
                select: {
                  requestId: true,
                  request: { select: { id: true, title: true } },
                },
              },
            },
          })
        : Promise.resolve([]),
    ]);

    type Ctx = {
      requestId: string | null;
      requestTitle: string | null;
      projectId: string | null;
      projectTitle: string | null;
      stageLabel: string;
    };

    const byQuote = new Map<string, Ctx>();
    for (const q of quotes) {
      byQuote.set(q.id, {
        requestId: q.request?.id ?? q.requestId,
        requestTitle: q.request?.title ?? q.title,
        projectId: q.project?.id ?? null,
        projectTitle: q.project?.title ?? null,
        stageLabel: 'Quote',
      });
    }

    const byPayment = new Map<string, Ctx>();
    for (const p of payments) {
      byPayment.set(p.id, {
        requestId: p.project?.quote?.request?.id ?? p.project?.quote?.requestId ?? null,
        requestTitle: p.project?.quote?.request?.title ?? p.project?.title ?? null,
        projectId: p.project?.id ?? p.projectId,
        projectTitle: p.project?.title ?? null,
        stageLabel: 'Payment',
      });
    }

    const byProject = new Map<string, Ctx>();
    for (const p of projects) {
      byProject.set(p.id, {
        requestId: p.quote?.request?.id ?? p.quote?.requestId ?? null,
        requestTitle: p.quote?.request?.title ?? p.title,
        projectId: p.id,
        projectTitle: p.title,
        stageLabel: 'Project',
      });
    }

    const emptyCtx: Ctx = {
      requestId: null,
      requestTitle: null,
      projectId: null,
      projectTitle: null,
      stageLabel: 'Other',
    };

    return items.map((item) => {
      let ctx = emptyCtx;
      if (item.entityType === 'QUOTE') ctx = byQuote.get(item.entityId) ?? { ...emptyCtx, stageLabel: 'Quote' };
      else if (item.entityType === 'PAYMENT')
        ctx = byPayment.get(item.entityId) ?? { ...emptyCtx, stageLabel: 'Payment' };
      else if (item.entityType === 'PROJECT')
        ctx = byProject.get(item.entityId) ?? { ...emptyCtx, stageLabel: 'Project' };
      else if (item.entityType === 'USER') ctx = { ...emptyCtx, stageLabel: 'Account' };

      return {
        ...item,
        requestId: ctx.requestId,
        requestTitle: ctx.requestTitle,
        projectId: ctx.projectId,
        projectTitle: ctx.projectTitle,
        stageLabel: ctx.stageLabel,
      };
    });
  }

  async getDocumentDownloadUrlForUser(
    documentId: string,
    userId: string,
  ): Promise<DocumentDownloadResult | null> {
    const doc = await this.prismaRead.generatedDocument.findUnique({
      where: { id: documentId },
    });
    if (!doc || doc.status !== DocumentStatus.GENERATED) return null;
    if (doc.issuedToUserId !== userId) return null;

    // NL-PAY-011: same due/paid visibility gate as listIssuedToUser / GET /invoices.
    const visible = await this.filterClientVisibleDocuments(userId, [
      {
        documentType: doc.documentType,
        entityType: doc.entityType,
        entityId: doc.entityId,
      },
    ]);
    if (visible.length === 0) return null;

    return this.getDocumentDownloadUrl(documentId);
  }

  async getDocumentDownloadUrl(documentId: string): Promise<DocumentDownloadResult | null> {
    const doc = await this.prismaRead.generatedDocument.findUnique({
      where: { id: documentId },
    });
    if (!doc || doc.status !== DocumentStatus.GENERATED) return null;
    if (!doc.storageBucket || !doc.storageKey) return null;

    const expiresIn = Number(process.env.S3_PRESIGNED_URL_EXPIRY || 900);
    const downloadUrl = await this.documentStorage.getDownloadUrl(
      doc.storageBucket,
      doc.storageKey,
      expiresIn,
    );
    const safeNumber = doc.documentNumber.replace(/[^\w.-]+/g, '_');
    const filename = `${doc.documentType.toLowerCase()}-${safeNumber}-v${doc.versionNumber}.pdf`;

    return {
      id: doc.id,
      documentNumber: doc.documentNumber,
      versionNumber: doc.versionNumber,
      documentType: doc.documentType,
      downloadUrl,
      filename,
      expiresIn,
    };
  }

  async verifyDocument(documentNumber: string) {
    const normalized = documentNumber.trim();
    if (!normalized) return null;

    const candidates = expandDocumentNumberCandidates(normalized);

    for (const candidate of candidates) {
      const doc = await this.prismaRead.generatedDocument.findUnique({
        where: { documentNumber: candidate },
      });
      if (doc) {
        const status = await this.resolveVerifyStatus(
          doc.status === DocumentStatus.GENERATED ? 'VALID' : doc.status,
          doc.entityType,
          doc.entityId,
        );
        return {
          documentNumber: doc.documentNumber,
          type: doc.documentType,
          version: doc.versionNumber,
          status,
          issuedAt: doc.issuedAt.toISOString(),
          entityRef: `${doc.entityType} / ${doc.entityId.slice(0, 8)}`,
          fileHash: doc.fileHash,
          isLatest: doc.isLatest,
        };
      }
    }

    // Seeded / legacy payment invoice numbers (e.g. INV-NL-…) may not match NL-INV-… registry ids.
    const payment = await this.prismaRead.payment.findFirst({
      where: {
        OR: [
          { invoiceNumber: { in: candidates } },
          { receiptNumber: { in: candidates } },
        ],
      },
      select: {
        id: true,
        invoiceNumber: true,
        receiptNumber: true,
        paidAt: true,
        createdAt: true,
        status: true,
        currentInvoiceDocumentId: true,
        currentReceiptDocumentId: true,
      },
    });
    if (!payment) return null;

    const isReceipt = candidates.some((c) => payment.receiptNumber === c);
    const linkedDocId = isReceipt
      ? payment.currentReceiptDocumentId
      : payment.currentInvoiceDocumentId;
    if (linkedDocId) {
      const linked = await this.prismaRead.generatedDocument.findUnique({
        where: { id: linkedDocId },
      });
      if (linked) {
        const status = await this.resolveVerifyStatus(
          linked.status === DocumentStatus.GENERATED ? 'VALID' : linked.status,
          linked.entityType,
          linked.entityId,
        );
        return {
          documentNumber: linked.documentNumber,
          type: linked.documentType,
          version: linked.versionNumber,
          status,
          issuedAt: linked.issuedAt.toISOString(),
          entityRef: `${linked.entityType} / ${linked.entityId.slice(0, 8)}`,
          fileHash: linked.fileHash,
          isLatest: linked.isLatest,
        };
      }
    }

    // Payment shows an invoice/receipt number in the UI but PDF generation has not stored a row yet.
    const paymentStatus = String(payment.status || '').toUpperCase();
    const revoked = paymentStatus === 'REFUNDED' || paymentStatus === 'CANCELLED';
    return {
      documentNumber: payment.invoiceNumber || payment.receiptNumber || normalized,
      type: isReceipt ? 'RECEIPT' : 'INVOICE',
      version: 0,
      status: revoked ? 'REVOKED' : 'PENDING',
      issuedAt: (payment.paidAt ?? payment.createdAt).toISOString(),
      entityRef: `payment / ${payment.id.slice(0, 8)}`,
      fileHash: null,
      isLatest: false,
    };
  }

  /**
   * A generated PDF must not stay publicly VALID after the linked payment is
   * fully refunded or cancelled. Partial refunds stay VALID (no credit-note row).
   */
  private async resolveVerifyStatus(
    status: string,
    entityType: string,
    entityId: string,
  ): Promise<string> {
    if (status !== 'VALID') return status;
    if (String(entityType).toUpperCase() !== 'PAYMENT' || !entityId) return status;

    const payment = await this.prismaRead.payment.findFirst({
      where: { id: entityId },
      select: { status: true },
    });
    const paymentStatus = String(payment?.status || '').toUpperCase();
    if (paymentStatus === 'REFUNDED' || paymentStatus === 'CANCELLED') return 'REVOKED';
    return status;
  }
}
