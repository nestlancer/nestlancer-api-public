import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { BusinessLogicException, RequestStatus, sanitizeUserContent, toPaise } from '@nestlancer/common';
import { CreateRequestDto } from '../dto/create-request.dto';
import { UpdateRequestDto } from '../dto/update-request.dto';
import { AdminCapacityService } from './admin-capacity.service';

const RESOURCE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class RequestsService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
    private readonly capacity: AdminCapacityService,
  ) {}

  async createRequest(userId: string, dto: CreateRequestDto) {
    let referencePortfolioSlug: string | undefined;
    if (dto.referencePortfolioItemId) {
      const ref = await this.prismaRead.portfolioItem.findFirst({
        where: {
          id: dto.referencePortfolioItemId,
          status: 'PUBLISHED',
          deletedAt: null,
        },
        select: { id: true, slug: true },
      });
      if (!ref) {
        throw new BusinessLogicException('Referenced portfolio item not found', 'REQUEST_010');
      }
      referencePortfolioSlug = ref.slug;
    }

    let servicePackageId: string | undefined;
    let servicePackage:
      | { id: string; name: string; description: string | null; basePricePaise: number }
      | undefined;
    if (dto.servicePackageId) {
      const pkg = await this.prismaRead.servicePackage.findFirst({
        where: { id: dto.servicePackageId, isActive: true },
        select: { id: true, name: true, description: true, basePricePaise: true },
      });
      if (!pkg) {
        throw new BusinessLogicException('Service package not found or inactive', 'REQUEST_011');
      }
      servicePackageId = pkg.id;
      servicePackage = pkg;
    }

    if (dto.budget.max < dto.budget.min) {
      throw new BusinessLogicException(
        'Budget maximum must be greater than or equal to the minimum',
        'REQUEST_012',
      );
    }

    const title = sanitizeUserContent(
      dto.title?.trim() || servicePackage?.name || dto.title || '',
      100,
    );
    if (title.length < 5) {
      throw new BusinessLogicException('Title contains invalid content', 'REQUEST_012');
    }
    let description = sanitizeUserContent(dto.description?.trim() ?? '', 5000);
    if (description.length < 20 && servicePackage?.description) {
      const fromPkg = servicePackage.description.trim();
      description =
        fromPkg.length >= 20
          ? fromPkg
          : `${fromPkg} — based on ${servicePackage.name} package.`.slice(0, 5000);
      if (description.length < 20) {
        description = description.padEnd(20, '.');
      }
    }

    let budgetMin = toPaise(dto.budget.min);
    let budgetMax = toPaise(dto.budget.max);
    if (budgetMin === 0 && budgetMax === 0 && servicePackage?.basePricePaise) {
      budgetMin = servicePackage.basePricePaise;
      budgetMax = servicePackage.basePricePaise;
    }

    if (!dto.timeline?.preferredStartDate || !dto.timeline?.deadline) {
      throw new BusinessLogicException(
        'Timeline preferredStartDate and deadline are required',
        'REQUEST_012',
      );
    }
    const preferredStartDate = new Date(dto.timeline.preferredStartDate);
    const deadline = new Date(dto.timeline.deadline);
    if (Number.isNaN(preferredStartDate.getTime()) || Number.isNaN(deadline.getTime())) {
      throw new BusinessLogicException(
        'Timeline dates must be valid ISO date strings',
        'REQUEST_013',
      );
    }

    const requirements = (Array.isArray(dto.requirements) ? dto.requirements : []).map((item) =>
      sanitizeUserContent(String(item), 200),
    );

    const request = await this.prismaWrite.$transaction(async (tx: any) => {
      const newReq = await tx.projectRequest.create({
        data: {
          userId,
          title,
          description,
          category: dto.category,
          servicePackageId,
          referencePortfolioItemId: referencePortfolioSlug
            ? dto.referencePortfolioItemId
            : undefined,
          referencePortfolioSlug,
          budgetMin,
          budgetMax,
          budgetCurrency: dto.budget.currency,
          budgetFlexible: dto.budget.flexible,
          preferredStartDate,
          deadline,
          timelineFlexible: dto.timeline.flexible ?? false,
          requirements,
          technicalRequirements: dto.technicalRequirements
            ? JSON.parse(JSON.stringify(dto.technicalRequirements))
            : null,
          additionalInfo: dto.additionalInfo,
          status: 'DRAFT',
        },
      });

      await tx.requestStatusHistory.create({
        data: {
          requestId: newReq.id,
          status: 'DRAFT',
          note: 'Request created',
        },
      });

      return newReq;
    });

    return this.formatRequestResponse(request);
  }

  async getMyRequests(
    userId: string,
    options: { page?: number; limit?: number; status?: string } = {},
  ) {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.min(100, Math.max(1, options.limit ?? 20));
    const where: Record<string, unknown> = { userId, deletedAt: null };

    if (options.status) {
      const raw = options.status.trim();
      if (raw && raw.toLowerCase() !== 'all') {
        const normalized = raw.replace(/([A-Z])/g, '_$1').replace(/^_/, '').toUpperCase();
        const allowed = new Set<string>(Object.values(RequestStatus));
        if (!allowed.has(normalized)) {
          throw new BadRequestException(
            `Invalid request status. Use one of: ${[...allowed].join(', ')}, or all`,
          );
        }
        where.status = normalized;
      }
    }

    const [requests, total] = await Promise.all([
      this.prismaRead.projectRequest.findMany({
        where: where as any,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prismaRead.projectRequest.count({ where: where as any }),
    ]);

    return {
      items: requests.map(this.formatRequestSummary),
      total,
      page,
      pageSize: limit,
      hasMore: page * limit < total,
    };
  }

  async getRequestDetails(userId: string, requestId: string) {
    if (!RESOURCE_ID.test(requestId)) {
      throw new BusinessLogicException('Request not found', 'REQUEST_001');
    }
    const request = await this.prismaWrite.projectRequest.findFirst({
      where: { id: requestId, userId, deletedAt: null },
      include: {
        attachments: true,
        quote: {
          select: { id: true, status: true, totalAmount: true, createdAt: true },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      } as any,
    });

    if (!request) {
      throw new BusinessLogicException('Request not found', 'REQUEST_001');
    }

    return this.formatRequestDetailResponse(request as any);
  }

  /** Get status timeline for a request (doc: GET /requests/:id/status) */
  async getStatusTimeline(userId: string, requestId: string) {
    if (!RESOURCE_ID.test(requestId)) {
      throw new BusinessLogicException('Request not found', 'REQUEST_001');
    }
    const request = await this.prismaWrite.projectRequest.findFirst({
      where: { id: requestId, userId, deletedAt: null },
      include: {
        statusHistory: { orderBy: { createdAt: 'asc' } },
      } as any,
    });

    if (!request) {
      throw new BusinessLogicException('Request not found', 'REQUEST_001');
    }

    return {
      id: request.id,
      status: (request as any).status
        .toLowerCase()
        .replace(/_([a-z])/g, (_m: string, g: string) => g.toUpperCase()),
      statusHistory: ((request as any).statusHistory || []).map((sh: any) => ({
        status: sh.status
          .toLowerCase()
          .replace(/_([a-z])/g, (_m: string, g: string) => g.toUpperCase()),
        timestamp: sh.createdAt,
        note: sh.note,
      })),
    };
  }

  async updateRequest(userId: string, requestId: string, dto: UpdateRequestDto) {
    const request = await this.prismaWrite.projectRequest.findFirst({
      where: { id: requestId, userId, deletedAt: null },
    });

    if (!request) {
      throw new BusinessLogicException('Request not found', 'REQUEST_001');
    }

    if (request.status !== 'DRAFT' && request.status !== 'CHANGES_REQUESTED') {
      throw new BusinessLogicException('Cannot modify submitted request', 'REQUEST_003');
    }

    const updateData: any = {};
    if (dto.title) updateData.title = dto.title;
    if (dto.description) updateData.description = dto.description;
    if (dto.category) updateData.category = dto.category;
    if (dto.budget) {
      updateData.budgetMin = toPaise(dto.budget.min);
      updateData.budgetMax = toPaise(dto.budget.max);
      updateData.budgetCurrency = dto.budget.currency;
      updateData.budgetFlexible = dto.budget.flexible;
    }
    if (dto.timeline) {
      updateData.preferredStartDate = new Date(dto.timeline.preferredStartDate);
      updateData.deadline = new Date(dto.timeline.deadline);
      updateData.timelineFlexible = dto.timeline.flexible;
    }
    if (dto.requirements) updateData.requirements = dto.requirements;
    if (dto.technicalRequirements)
      updateData.technicalRequirements = JSON.parse(JSON.stringify(dto.technicalRequirements));
    if (dto.additionalInfo !== undefined) updateData.additionalInfo = dto.additionalInfo;

    const updated = await this.prismaWrite.projectRequest.update({
      where: { id: requestId },
      data: updateData,
    });

    return this.formatRequestResponse(updated as any);
  }

  async submitRequest(userId: string, requestId: string) {
    const request = await this.prismaWrite.projectRequest.findFirst({
      where: { id: requestId, userId, deletedAt: null },
    });

    if (!request) {
      throw new BusinessLogicException('Request not found', 'REQUEST_001');
    }

    if (request.status !== 'DRAFT' && request.status !== 'CHANGES_REQUESTED') {
      throw new BusinessLogicException('Invalid status transition', 'REQUEST_005');
    }

    // Basic validation to ensure required fields exist before submitting
    if (!(request as any).budgetMin || !(request as any).deadline) {
      throw new BusinessLogicException('Cannot submit incomplete request', 'REQUEST_009', {
        missingFields: ['budget', 'timeline'],
      });
    }

    await this.capacity.assertCanAcceptRequest();

    const estimatedQuoteDate = new Date();
    estimatedQuoteDate.setDate(estimatedQuoteDate.getDate() + 2); // 48 hour SLA

    await this.prismaWrite.$transaction(async (tx: any) => {
      await tx.projectRequest.update({
        where: { id: requestId },
        data: {
          status: 'SUBMITTED',
          submittedAt: new Date(),
        },
      });

      await tx.requestStatusHistory.create({
        data: {
          requestId,
          status: 'SUBMITTED',
          note: 'Submitted for review',
        },
      });

      await tx.outbox.create({
        data: {
          type: 'REQUEST_SUBMITTED',
          payload: { requestId, userId, category: request.category },
        },
      });
    });

    return {
      id: requestId,
      status: 'submitted',
      submittedAt: new Date(),
      estimatedQuoteDate,
    };
  }

  async deleteRequest(userId: string, requestId: string) {
    const request = await this.prismaWrite.projectRequest.findFirst({
      where: { id: requestId, userId, deletedAt: null },
    });

    if (!request) {
      throw new BusinessLogicException('Request not found', 'REQUEST_001');
    }

    if (request.status !== 'DRAFT') {
      throw new BusinessLogicException('Cannot delete non-draft request', 'REQUEST_004');
    }

    await this.prismaWrite.projectRequest.update({
      where: { id: requestId },
      data: { deletedAt: new Date() },
    });

    return true;
  }

  // Helpers
  private formatRequestSummary(req: any) {
    return {
      id: req.id,
      title: req.title,
      status: req.status
        .toLowerCase()
        .replace(/_([a-z])/g, (_match: string, g: string) => g.toUpperCase()), // DRAFT -> draft, UNDER_REVIEW -> underReview
      category: req.category,
      createdAt: req.createdAt,
      submittedAt: req.submittedAt,
    };
  }

  private formatRequestResponse(req: any) {
    return {
      ...this.formatRequestSummary(req),
      expiresAt: null, // Logic for expiration if draft sits too long
    };
  }

  private formatRequestDetailResponse(req: any) {
    return {
      id: req.id,
      title: req.title,
      description: req.description,
      category: req.category,
      status: req.status
        .toLowerCase()
        .replace(/_([a-z])/g, (_match: string, g: string) => g.toUpperCase()),
      budget: {
        min: req.budgetMin,
        max: req.budgetMax,
        currency: req.budgetCurrency,
        flexible: req.budgetFlexible,
      },
      timeline: {
        preferredStartDate: req.preferredStartDate,
        deadline: req.deadline,
        flexible: req.timelineFlexible,
      },
      requirements: req.requirements,
      technicalRequirements: req.technicalRequirements,
      attachments:
        req.attachments?.map((a: any) => ({
          id: a.id,
          filename: a.filename,
          type: a.mimeType,
          size: a.size,
        })) || [],
      quotes: req.quote && !['DRAFT', 'PENDING'].includes(String(req.quote.status).toUpperCase())
        ? [
            {
              id: req.quote.id,
              status: req.quote.status.toLowerCase(),
              totalAmount: req.quote.totalAmount,
              createdAt: req.quote.createdAt,
            },
          ]
        : [],
      statusHistory:
        req.statusHistory?.map((sh: any) => ({
          status: sh.status
            .toLowerCase()
            .replace(/_([a-z])/g, (_match: string, g: string) => g.toUpperCase()),
          timestamp: sh.createdAt,
          note: sh.note,
        })) || [],
      createdAt: req.createdAt,
      updatedAt: req.updatedAt,
      submittedAt: req.submittedAt,
    };
  }
}
