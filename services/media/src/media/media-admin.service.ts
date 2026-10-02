import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common';
import { PrismaWriteService, PrismaReadService, ReadOnly } from '@nestlancer/database';
import { OutboxService } from '@nestlancer/outbox';
import {
  buildPrismaSkipTake,
  createPaginationMeta,
  ResourceNotFoundException,
} from '@nestlancer/common';
import { QueryMediaDto } from '../dto/query-media.dto';
import { AdminUpdateMediaDto } from '../dto/admin-update-media.dto';
import { BulkDeleteMediaDto } from '../dto/bulk-delete-media.dto';
import { MediaStatus, FileType } from '../interfaces/media.interface';
import { MediaJobContext } from '../interfaces/media-processing.interface';
import { MediaStorageService } from '../storage/storage.service';
import { MediaProcessingService } from './media-processing.service';
import { AdminMediaReferencesService } from './media-admin-references.service';
import { MediaAdminPublicScopeService, PublicMediaScope } from './media-admin-public-scope.service';
import { MediaLibraryScopeService } from './media-library-scope.service';
import {
  buildMediaWhereClause,
  formatUploaderSummary,
  mimeTypesForFileType,
  parseSortParam,
} from './media-admin-query.util';
import { enrichMediaList, enrichMediaUrls } from './media-urls.util';
import { inferFileTypeFromMime, validateUploadRequest } from './upload-validation.util';
import { ShareService } from '../share/share.service';
import { ShareMediaDto } from '../dto/share-media.dto';

const UPLOADER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
} as const;

type UploadedFilePayload = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@Injectable()
export class MediaAdminService {
  private readonly logger = new Logger(MediaAdminService.name);

  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
    private readonly storageService: MediaStorageService,
    private readonly mediaProcessing: MediaProcessingService,
    private readonly outboxService: OutboxService,
    private readonly referencesService: AdminMediaReferencesService,
    private readonly publicScope: MediaAdminPublicScopeService,
    private readonly shareService: ShareService,
    private readonly libraryScope: MediaLibraryScopeService,
  ) {}

  private async buildListWhere(query: QueryMediaDto): Promise<Record<string, unknown>> {
    const specialSources = new Set([
      'delivery',
      'deliverable',
      'message',
      'project',
      'uploads',
      'ungrouped',
      'folder',
    ]);
    const usesSpecialSource = Boolean(
      query.contextType && specialSources.has(String(query.contextType)),
    );

    if (query.relatedToUserId) {
      const relatedWhere = await this.libraryScope.buildRelatedToUserWhere(query.relatedToUserId, {
        fileType: query.fileType,
        status: query.status,
        search: query.search,
        source: (query.contextType as any) || 'all',
        contextId: query.contextId,
      });
      if (query.visibility === 'PRIVATE') {
        const publicScope = await this.publicScope.resolvePublicScope();
        if (publicScope.ids.length > 0) {
          return { AND: [relatedWhere, { id: { notIn: publicScope.ids } }] };
        }
      }
      if (query.visibility === 'PUBLIC') {
        const publicWhere = await this.publicScope.buildPublicWhere();
        return { AND: [relatedWhere, publicWhere] };
      }
      return relatedWhere;
    }

    // Admin source chips without a user selected (e.g. Deliveries) must use reference-based filters.
    if (usesSpecialSource) {
      const sourceWhere = await this.libraryScope.buildAdminSourceWhere({
        fileType: query.fileType,
        status: query.status,
        search: query.search,
        source: query.contextType as any,
        contextId: query.contextId,
      });
      if (query.visibility === 'PRIVATE') {
        const publicScope = await this.publicScope.resolvePublicScope();
        const scoped =
          publicScope.ids.length > 0
            ? { AND: [sourceWhere, { id: { notIn: publicScope.ids } }] }
            : sourceWhere;
        if (query.uploaderId) {
          return { AND: [scoped, { uploaderId: query.uploaderId }] };
        }
        return scoped;
      }
      if (query.visibility === 'PUBLIC') {
        const publicWhere = await this.publicScope.buildPublicWhere({
          uploaderId: query.uploaderId,
        });
        return { AND: [sourceWhere, publicWhere] };
      }
      if (query.uploaderId) {
        return { AND: [sourceWhere, { uploaderId: query.uploaderId }] };
      }
      return sourceWhere;
    }

    if (query.visibility === 'PUBLIC') {
      const publicWhere = await this.publicScope.buildPublicWhere({
        contextType: query.contextType,
        uploaderId: query.uploaderId,
      });
      const extra = buildMediaWhereClause({
        fileType: query.fileType,
        status: query.status,
        search: query.search,
        contextId: query.contextId,
      });
      return { AND: [publicWhere, extra] };
    }

    if (query.visibility === 'PRIVATE') {
      // "Private" means not in the public/published asset scope — not the DB visibility enum.
      // Blog/portfolio featured images often remain visibility=PRIVATE while still public-scoped.
      const publicScope = await this.publicScope.resolvePublicScope();
      const extra = buildMediaWhereClause({
        fileType: query.fileType,
        status: query.status,
        search: query.search,
        uploaderId: query.uploaderId,
        contextType: query.contextType,
        contextId: query.contextId,
      });
      const parts: Record<string, unknown>[] = [extra];
      if (!query.status) {
        parts.push({
          status: { in: ['READY', 'PROCESSING', 'FAILED', 'QUARANTINED'] },
        });
      }
      if (publicScope.ids.length > 0) {
        parts.push({ id: { notIn: publicScope.ids } });
      }
      return parts.length === 1 ? parts[0]! : { AND: parts };
    }

    const base = buildMediaWhereClause({
      fileType: query.fileType,
      status: query.status,
      search: query.search,
      uploaderId: query.uploaderId,
      visibility: query.visibility,
      contextType: query.contextType,
      contextId: query.contextId,
    });
    if (query.status) return base;
    return {
      AND: [base, { status: { in: ['READY', 'PROCESSING', 'FAILED', 'QUARANTINED'] } }],
    };
  }

  @ReadOnly()
  async findAll(query: QueryMediaDto) {
    const { skip, take } = buildPrismaSkipTake(query.page, query.limit);
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const { field, direction } = parseSortParam(query.sort);
    const where = await this.buildListWhere(query);

    const [items, total] = await Promise.all([
      this.prismaRead.media.findMany({
        where,
        skip,
        take,
        orderBy: { [field]: direction },
        include: { uploader: { select: UPLOADER_SELECT } },
      }),
      this.prismaRead.media.count({ where }),
    ]);

    const includeUrls = query.includeUrls === true;
    const enriched = includeUrls
      ? await enrichMediaList(items as Record<string, unknown>[], this.storageService)
      : (items as Record<string, unknown>[]);
    const data = enriched.map((item, index) => ({
      ...item,
      uploader: formatUploaderSummary(
        (items[index] as { uploader?: Parameters<typeof formatUploaderSummary>[0] }).uploader,
      ),
    }));

    return {
      data,
      pagination: createPaginationMeta(total, page, limit),
    };
  }

  @ReadOnly()
  async findById(id: string) {
    const media = await this.prismaRead.media.findUnique({
      where: { id },
      include: { uploader: { select: UPLOADER_SELECT } },
    });
    if (!media) {
      throw new ResourceNotFoundException('Media');
    }

    const enriched = await enrichMediaUrls(media as Record<string, unknown>, this.storageService);
    return {
      ...enriched,
      uploader: formatUploaderSummary(media.uploader),
    };
  }

  @ReadOnly()
  async findQuarantined(query: QueryMediaDto) {
    return this.findAll({
      ...query,
      status: MediaStatus.QUARANTINED,
    });
  }

  @ReadOnly()
  async getBrowseFolders(
    query: Pick<QueryMediaDto, 'visibility' | 'uploaderId' | 'contextType'> & { search?: string },
  ) {
    if (!query.visibility) {
      const publicScope = await this.publicScope.resolvePublicScope();
      const publicIds = publicScope.ids;

      const [publicAgg, privateAgg] = await Promise.all([
        publicIds.length > 0
          ? this.prismaRead.media.aggregate({
              where: { id: { in: publicIds } },
              _count: true,
              _sum: { size: true },
            })
          : Promise.resolve({ _count: 0, _sum: { size: 0 } }),
        publicIds.length > 0
          ? this.prismaRead.media.aggregate({
              where: { id: { notIn: publicIds } },
              _count: true,
              _sum: { size: true },
            })
          : this.prismaRead.media.aggregate({
              _count: true,
              _sum: { size: true },
            }),
      ]);

      return {
        scope: { level: 'root' },
        breadcrumbs: [{ id: 'root', label: 'Storage', path: '' }],
        folders: [
          {
            id: 'PUBLIC',
            type: 'bucket',
            label: 'Public',
            description: 'Blog, portfolio, and other published-site assets',
            count: publicAgg._count,
            totalSize: publicAgg._sum.size ?? 0,
          },
          {
            id: 'PRIVATE',
            type: 'bucket',
            label: 'Private',
            description: 'User-owned private storage',
            count: privateAgg._count,
            totalSize: privateAgg._sum.size ?? 0,
          },
        ],
      };
    }

    if (query.visibility === 'PUBLIC' && !query.uploaderId && !query.contextType) {
      const scope = await this.publicScope.resolvePublicScope();
      const publicWhere = await this.publicScope.buildPublicWhere();
      const sourceFolders = await this.buildPublicSourceFolders(scope);
      const categoryFolders = await this.buildCategoryFolders(publicWhere);

      return {
        scope: { level: 'public-sources', visibility: 'PUBLIC' },
        breadcrumbs: [
          { id: 'root', label: 'Storage', path: '' },
          { id: 'PUBLIC', label: 'Public', path: 'PUBLIC' },
        ],
        folders: [...sourceFolders, ...categoryFolders],
      };
    }

    if (query.visibility === 'PRIVATE' && !query.uploaderId) {
      const publicScope = await this.publicScope.resolvePublicScope();
      const privateWhere = publicScope.ids.length > 0 ? { id: { notIn: publicScope.ids } } : {};
      const search = query.search?.trim();

      // Search any user by email/name (including accounts with zero owned uploads).
      if (search) {
        const matchedUsers = await this.prismaRead.user.findMany({
          where: {
            OR: [
              { email: { contains: search, mode: 'insensitive' } },
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
            ],
          },
          select: UPLOADER_SELECT,
          take: 50,
          orderBy: { email: 'asc' },
        });

        const userIds = matchedUsers.map((u) => u.id);
        const [ownedStats, accessible] = await Promise.all([
          userIds.length > 0
            ? this.prismaRead.media.groupBy({
                by: ['uploaderId'],
                where: {
                  ...privateWhere,
                  uploaderId: { in: userIds },
                  status: { in: ['READY', 'PROCESSING', 'FAILED', 'QUARANTINED'] },
                },
                _count: true,
                _sum: { size: true },
              })
            : Promise.resolve([]),
          this.libraryScope.countAccessibleMediaForUsers(userIds),
        ]);
        const ownedById = new Map(ownedStats.map((row) => [row.uploaderId, row]));

        return {
          scope: { level: 'private-users', visibility: 'PRIVATE', search },
          breadcrumbs: [
            { id: 'root', label: 'Storage', path: '' },
            { id: 'PRIVATE', label: 'Private', path: 'PRIVATE' },
          ],
          folders: matchedUsers.map((uploader) => {
            const summary = formatUploaderSummary(uploader);
            const owned = ownedById.get(uploader.id);
            const lib = accessible.get(uploader.id);
            const isAdmin = uploader.role === 'ADMIN';
            // Admins: owned-only (avoid platform-wide inflation). Clients: accessible library.
            const count = isAdmin ? (owned?._count ?? 0) : (lib?.count ?? owned?._count ?? 0);
            const totalSize = isAdmin
              ? (owned?._sum.size ?? 0)
              : (lib?.totalSize ?? owned?._sum.size ?? 0);
            return {
              id: uploader.id,
              type: 'user',
              label: summary?.displayName ?? summary?.email ?? uploader.id,
              description: summary?.email,
              count,
              relatedCount: lib?.count ?? owned?._count ?? 0,
              totalSize,
            };
          }),
        };
      }

      const grouped = await this.prismaRead.media.groupBy({
        by: ['uploaderId'],
        where: {
          ...privateWhere,
          status: { in: ['READY', 'PROCESSING', 'FAILED', 'QUARANTINED'] },
        },
        _count: true,
        _sum: { size: true },
      });

      // Also surface clients who have deliverables but zero personal uploads.
      const clientsWithProjects = await this.prismaRead.project.findMany({
        where: { deletedAt: null },
        select: { clientId: true },
        distinct: ['clientId'],
        take: 200,
      });
      const clientIds = clientsWithProjects.map((p) => p.clientId).filter(Boolean) as string[];
      const ownedIds = new Set(grouped.map((g) => g.uploaderId));
      const extraClientIds = clientIds.filter((id) => !ownedIds.has(id));

      const allUserIds = [...ownedIds, ...extraClientIds].slice(0, 150);
      const accessible = await this.libraryScope.countAccessibleMediaForUsers(allUserIds);

      const ranked = allUserIds
        .map((id) => {
          const owned = grouped.find((g) => g.uploaderId === id);
          const lib = accessible.get(id);
          return {
            uploaderId: id,
            ownedCount: owned?._count ?? 0,
            ownedSize: owned?._sum.size ?? 0,
            accessibleCount: lib?.count ?? owned?._count ?? 0,
            accessibleSize: lib?.totalSize ?? owned?._sum.size ?? 0,
          };
        })
        .sort((a, b) => b.accessibleCount - a.accessibleCount)
        .slice(0, 100);

      const uploaders =
        ranked.length > 0
          ? await this.prismaRead.user.findMany({
              where: { id: { in: ranked.map((r) => r.uploaderId) } },
              select: UPLOADER_SELECT,
            })
          : [];
      const uploaderById = new Map(uploaders.map((u) => [u.id, u]));

      return {
        scope: { level: 'private-users', visibility: 'PRIVATE' },
        breadcrumbs: [
          { id: 'root', label: 'Storage', path: '' },
          { id: 'PRIVATE', label: 'Private', path: 'PRIVATE' },
        ],
        folders: ranked.map((row) => {
          const uploader = uploaderById.get(row.uploaderId);
          const summary = formatUploaderSummary(uploader);
          const isAdmin = uploader?.role === 'ADMIN';
          return {
            id: row.uploaderId,
            type: 'user',
            label: summary?.displayName ?? summary?.email ?? row.uploaderId,
            description: summary?.email,
            count: isAdmin ? row.ownedCount : row.accessibleCount,
            relatedCount: row.accessibleCount,
            totalSize: isAdmin ? row.ownedSize : row.accessibleSize,
          };
        }),
      };
    }

    const baseWhere =
      query.visibility === 'PUBLIC'
        ? await this.publicScope.buildPublicWhere({
            contextType: query.contextType,
            uploaderId: query.uploaderId,
          })
        : await this.buildPrivateBrowseWhere({
            uploaderId: query.uploaderId,
            contextType: query.contextType,
          });

    const categoryFolders = await this.buildCategoryFolders(baseWhere);
    const contextFolders = query.uploaderId ? await this.buildContextFolders(baseWhere) : [];

    const visibilityLabel = query.visibility === 'PUBLIC' ? 'Public' : 'Private';
    const breadcrumbs: Array<{ id: string; label: string; path: string }> = [
      { id: 'root', label: 'Storage', path: '' },
      { id: query.visibility!, label: visibilityLabel, path: query.visibility! },
    ];
    if (query.uploaderId) {
      const uploader = await this.prismaRead.user.findUnique({
        where: { id: query.uploaderId },
        select: UPLOADER_SELECT,
      });
      const summary = formatUploaderSummary(uploader);
      breadcrumbs.push({
        id: query.uploaderId,
        label: summary?.displayName ?? summary?.email ?? query.uploaderId,
        path: `${query.visibility}/${query.uploaderId}`,
      });
    }

    return {
      scope: {
        level: query.uploaderId ? 'user-categories' : 'bucket-categories',
        visibility: query.visibility,
        uploaderId: query.uploaderId,
      },
      breadcrumbs,
      folders: [...categoryFolders, ...contextFolders],
    };
  }

  private async buildPrivateBrowseWhere(options?: {
    uploaderId?: string;
    contextType?: string;
  }): Promise<Record<string, unknown>> {
    const publicScope = await this.publicScope.resolvePublicScope();
    const extra = buildMediaWhereClause({
      uploaderId: options?.uploaderId,
      contextType: options?.contextType,
    });
    if (publicScope.ids.length > 0) {
      return { AND: [extra, { id: { notIn: publicScope.ids } }] };
    }
    return extra;
  }

  private async buildPublicSourceFolders(scope: PublicMediaScope) {
    const sources: Array<{
      id: string;
      label: string;
      contextType: string;
      ids: string[];
    }> = [
      { id: 'blog', label: 'Blog', contextType: 'blog', ids: scope.blogIds },
      { id: 'portfolio', label: 'Portfolio', contextType: 'portfolio', ids: scope.portfolioIds },
      {
        id: 'explicit',
        label: 'CDN / explicit public',
        contextType: 'explicit',
        ids: scope.explicitIds,
      },
    ];

    const folders = await Promise.all(
      sources
        .filter((source) => source.ids.length > 0)
        .map(async (source) => {
          const agg = await this.prismaRead.media.aggregate({
            where: { id: { in: source.ids } },
            _count: true,
            _sum: { size: true },
          });
          return {
            id: source.id,
            type: 'context' as const,
            label: source.label,
            contextType: source.contextType,
            count: agg._count,
            totalSize: agg._sum.size ?? 0,
          };
        }),
    );

    return folders;
  }

  private async buildCategoryFolders(baseWhere: Record<string, unknown>) {
    const categories: Array<{ fileType: FileType; label: string }> = [
      { fileType: FileType.IMAGE, label: 'Images' },
      { fileType: FileType.DOCUMENT, label: 'Documents' },
      { fileType: FileType.VIDEO, label: 'Videos' },
      { fileType: FileType.ARCHIVE, label: 'Archives' },
    ];

    const folders = await Promise.all(
      categories.map(async ({ fileType, label }) => {
        const mimes = mimeTypesForFileType(fileType);
        const agg = await this.prismaRead.media.aggregate({
          where: { ...baseWhere, mimeType: { in: mimes } },
          _count: true,
          _sum: { size: true },
        });
        return {
          id: fileType,
          type: 'category',
          label,
          fileType,
          count: agg._count,
          totalSize: agg._sum.size ?? 0,
        };
      }),
    );

    return folders.filter((folder) => folder.count > 0);
  }

  private async buildContextFolders(baseWhere: Record<string, unknown>) {
    const grouped = await this.prismaRead.media.groupBy({
      by: ['contextType'],
      where: { ...baseWhere, contextType: { not: null } },
      _count: true,
      _sum: { size: true },
    });

    const labelForContext = (contextType: string | null) => {
      switch (contextType) {
        case 'project':
          return 'Projects';
        case 'thread':
          return 'Conversations';
        case 'message':
          return 'Messages';
        case 'folder':
          return 'Folders';
        default:
          return contextType ?? 'Other';
      }
    };

    const contextFolders = grouped
      .filter((row) => row.contextType)
      .map((row) => ({
        id: row.contextType!,
        type: 'context',
        label: labelForContext(row.contextType),
        contextType: row.contextType,
        count: row._count,
        totalSize: row._sum.size ?? 0,
      }));

    const ungroupedAgg = await this.prismaRead.media.aggregate({
      where: { ...baseWhere, contextId: null },
      _count: true,
      _sum: { size: true },
    });

    if (ungroupedAgg._count > 0) {
      contextFolders.push({
        id: 'ungrouped',
        type: 'context',
        label: 'Ungrouped',
        contextType: 'ungrouped',
        count: ungroupedAgg._count,
        totalSize: ungroupedAgg._sum.size ?? 0,
      });
    }

    return contextFolders;
  }

  @ReadOnly()
  async getAnalytics() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const [totalAgg, byStatus, byMimeType, recentMedia] = await Promise.all([
      this.prismaRead.media.aggregate({ _count: true, _sum: { size: true } }),
      this.prismaRead.media.groupBy({ by: ['status'], _count: true }),
      this.prismaRead.media.groupBy({
        by: ['mimeType'],
        _count: true,
        _sum: { size: true },
      }),
      this.prismaRead.media.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true },
      }),
    ]);

    const uploadsByDayMap = new Map<string, number>();
    for (let i = 29; i >= 0; i -= 1) {
      const day = new Date();
      day.setHours(0, 0, 0, 0);
      day.setDate(day.getDate() - i);
      uploadsByDayMap.set(day.toISOString().split('T')[0], 0);
    }
    for (const row of recentMedia) {
      const date = row.createdAt.toISOString().split('T')[0];
      if (uploadsByDayMap.has(date)) {
        uploadsByDayMap.set(date, (uploadsByDayMap.get(date) ?? 0) + 1);
      }
    }

    const processingCount =
      byStatus.find((row) => row.status === MediaStatus.PROCESSING)?._count ?? 0;
    const quarantineCount =
      byStatus.find((row) => row.status === MediaStatus.QUARANTINED)?._count ?? 0;

    return {
      totalCount: totalAgg._count,
      totalFiles: totalAgg._count,
      totalSize: totalAgg._sum.size ?? 0,
      byStatus: byStatus.map((row) => ({ status: row.status, count: row._count })),
      byMimeType: byMimeType.map((row) => ({
        mimeType: row.mimeType,
        count: row._count,
        size: row._sum.size ?? 0,
      })),
      uploadsByDay: Array.from(uploadsByDayMap.entries()).map(([date, count]) => ({
        date,
        count,
      })),
      processingCount,
      quarantineCount,
    };
  }

  @ReadOnly()
  async getDownloadUrl(id: string) {
    const media = await this.prismaRead.media.findUnique({ where: { id } });
    if (!media) {
      throw new ResourceNotFoundException('Media');
    }

    const metadata = media.metadata as { storageKey?: string } | null;
    const storageKey = metadata?.storageKey;
    if (!storageKey) {
      throw new ResourceNotFoundException('Storage file');
    }

    const downloadUrl = await this.storageService.generatePresignedDownloadUrl(
      storageKey,
      media.filename || undefined,
    );
    return { downloadUrl, expiresIn: 3600 };
  }

  @ReadOnly()
  async getReferences(id: string) {
    const media = await this.prismaRead.media.findUnique({ where: { id }, select: { id: true } });
    if (!media) {
      throw new ResourceNotFoundException('Media');
    }
    return this.referencesService.findReferences(id);
  }

  @ReadOnly()
  async getShares(id: string) {
    const media = await this.prismaRead.media.findUnique({ where: { id }, select: { id: true } });
    if (!media) {
      throw new ResourceNotFoundException('Media');
    }
    return this.shareService.listShareLinksForMedia(id);
  }

  async createShare(id: string, dto: ShareMediaDto) {
    return this.shareService.createShareLinkForMedia(id, dto);
  }

  async revokeShares(id: string) {
    return this.shareService.revokeShareLinksForMedia(id);
  }

  async revokeShareById(mediaId: string, shareLinkId: string) {
    return this.shareService.revokeShareLinkById(mediaId, shareLinkId);
  }

  @ReadOnly()
  async listOrphans() {
    const publicScope = await this.publicScope.resolvePublicScope();
    const where: Record<string, unknown> = {
      contextId: null,
      // Soft-deleted rows are already filtered by prisma middleware when present;
      // always exclude published-site assets from cleanup candidates.
      ...(publicScope.ids.length > 0 ? { id: { notIn: publicScope.ids } } : {}),
    };

    return this.prismaRead.media.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        filename: true,
        originalFilename: true,
        size: true,
        mimeType: true,
        status: true,
        uploaderId: true,
        createdAt: true,
      },
    });
  }

  async updateMetadata(id: string, dto: AdminUpdateMediaDto) {
    const media = await this.prismaWrite.media.findUnique({ where: { id } });
    if (!media) {
      throw new ResourceNotFoundException('Media');
    }

    const existingMetadata = (media.metadata ?? {}) as Record<string, unknown>;
    const data: Record<string, unknown> = {};

    if (dto.filename !== undefined) data.filename = dto.filename;
    if (dto.originalFilename !== undefined) data.originalFilename = dto.originalFilename;
    if (dto.visibility !== undefined) data.visibility = dto.visibility;

    const metadata: Record<string, unknown> = { ...existingMetadata };
    if (dto.description !== undefined) metadata.description = dto.description;
    if (dto.customMetadata !== undefined) metadata.customMetadata = dto.customMetadata;
    if (dto.metadataPatch !== undefined) Object.assign(metadata, dto.metadataPatch);
    data.metadata = metadata;

    const updated = await this.prismaWrite.media.update({
      where: { id },
      data: data as never,
    });

    return enrichMediaUrls(updated as Record<string, unknown>, this.storageService);
  }

  async deleteAny(id: string, options?: { force?: boolean; adminId?: string }) {
    const media = await this.prismaWrite.media.findUnique({ where: { id } });
    if (!media) {
      throw new ResourceNotFoundException('Media');
    }

    if (!options?.force) {
      const { references, referenceCount } = await this.referencesService.findReferences(id);
      if (referenceCount > 0) {
        throw new ConflictException({
          message: 'Media cannot be deleted while referenced by other resources',
          references,
          referenceCount,
        });
      }
    }

    const metadata = media.metadata as { storageKey?: string } | null;
    const storageKey = metadata?.storageKey;
    if (storageKey) {
      await this.storageService.deleteFile(storageKey).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Failed to delete S3 object ${storageKey}: ${message}`);
      });
    }

    await this.prismaWrite.$transaction(async (tx) => {
      await tx.media.delete({ where: { id } });
      await this.outboxService.createEvent(
        {
          aggregateType: 'MEDIA',
          aggregateId: id,
          type: 'MEDIA_ADMIN_DELETED',
          payload: {
            mediaId: id,
            adminId: options?.adminId,
            force: options?.force ?? false,
            uploaderId: media.uploaderId,
          },
        },
        tx,
      );
    });

    return { deleted: true, id };
  }

  async bulkDelete(dto: BulkDeleteMediaDto, adminId?: string) {
    const results: Array<{ id: string; deleted: boolean; error?: string }> = [];

    for (const id of dto.ids) {
      try {
        await this.deleteAny(id, { force: dto.force, adminId });
        results.push({ id, deleted: true });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        results.push({ id, deleted: false, error: message });
      }
    }

    return {
      results,
      deleted: results.filter((row) => row.deleted).length,
      failed: results.filter((row) => !row.deleted).length,
    };
  }

  async replaceFile(
    id: string,
    file: UploadedFilePayload,
    adminId?: string,
    options?: { force?: boolean },
  ) {
    const media = await this.prismaWrite.media.findUnique({ where: { id } });
    if (!media) {
      throw new ResourceNotFoundException('Media');
    }

    if (
      !options?.force &&
      (media.status === MediaStatus.UPLOADING || media.status === MediaStatus.PROCESSING)
    ) {
      throw new ConflictException(
        `Cannot replace media while status is ${media.status}. Use force=true to override.`,
      );
    }

    const fileType = inferFileTypeFromMime(file.mimetype);
    validateUploadRequest(fileType, file.mimetype, file.size);

    const newKey = this.storageService.generateStorageKey(media.uploaderId, file.originalname);
    await this.storageService.upload(
      this.storageService.privateBucket,
      newKey,
      file.buffer,
      file.mimetype,
    );

    const uploadedSize = await this.storageService.getFileSize(newKey);
    if (uploadedSize < 1) {
      throw new BadRequestException('Uploaded file verification failed');
    }

    const oldMetadata = (media.metadata ?? {}) as Record<string, unknown>;
    const oldKey = typeof oldMetadata.storageKey === 'string' ? oldMetadata.storageKey : undefined;

    const updated = await this.prismaWrite.media.update({
      where: { id },
      data: {
        filename: file.originalname,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        status: MediaStatus.PROCESSING,
        metadata: {
          ...oldMetadata,
          storageKey: newKey,
          replacedAt: new Date().toISOString(),
          replacedByAdminId: adminId,
        },
      },
    });

    if (oldKey && oldKey !== newKey) {
      await this.storageService.deleteFile(oldKey).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Failed to delete old S3 key ${oldKey}: ${message}`);
      });
    }

    await this.mediaProcessing.enqueue(updated, {
      context: this.jobContextFromMedia(updated),
    });

    await this.outboxService.createEvent({
      aggregateType: 'MEDIA',
      aggregateId: id,
      type: 'MEDIA_ADMIN_REPLACED',
      payload: {
        mediaId: id,
        adminId,
        oldStorageKey: oldKey,
        newStorageKey: newKey,
      },
    });

    return enrichMediaUrls(updated as Record<string, unknown>, this.storageService);
  }

  async backfillDeliverableContexts() {
    const context = await this.libraryScope.backfillDeliverableMediaContext();
    const stalePending = await this.prismaWrite.media.deleteMany({
      where: {
        status: { in: [MediaStatus.PENDING, MediaStatus.UPLOADING] },
        createdAt: { lt: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });
    return {
      ...context,
      stalePendingDeleted: stalePending.count,
    };
  }

  async cleanupOrphans(dryRun = false, adminId?: string) {
    const orphans = await this.listOrphans();

    if (dryRun) {
      return {
        dryRun: true,
        wouldDelete: orphans.length,
        cleaned: orphans.length,
        bytesFreed: orphans.reduce((acc, row) => acc + row.size, 0),
        ids: orphans.map((row) => row.id),
        orphans: orphans.map((row) => ({
          id: row.id,
          filename: row.filename ?? row.originalFilename ?? row.id,
          size: row.size,
          mimeType: row.mimeType,
          status: row.status,
          uploaderId: row.uploaderId,
          createdAt: row.createdAt,
        })),
      };
    }

    const results: Array<{ id: string; deleted: boolean; error?: string }> = [];
    for (const orphan of orphans) {
      try {
        await this.deleteAny(orphan.id, { force: true, adminId });
        results.push({ id: orphan.id, deleted: true });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        results.push({ id: orphan.id, deleted: false, error: message });
      }
    }

    const deletedIds = new Set(results.filter((row) => row.deleted).map((row) => row.id));

    return {
      dryRun: false,
      cleaned: results.filter((row) => row.deleted).length,
      failed: results.filter((row) => !row.deleted).length,
      bytesFreed: orphans
        .filter((row) => deletedIds.has(row.id))
        .reduce((acc, row) => acc + row.size, 0),
      results,
    };
  }

  async reprocess(id: string) {
    const media = await this.prismaWrite.media.findUnique({ where: { id } });
    if (!media) {
      throw new ResourceNotFoundException('Media');
    }

    const updated = await this.prismaWrite.media.update({
      where: { id },
      data: { status: MediaStatus.PROCESSING },
    });

    await this.mediaProcessing.enqueue(updated, {
      context: this.jobContextFromMedia(updated),
    });

    return updated;
  }

  async releaseQuarantined(id: string) {
    const media = await this.prismaWrite.media.findUnique({ where: { id } });
    if (!media) {
      throw new ResourceNotFoundException('Media');
    }
    if (media.status !== MediaStatus.QUARANTINED) {
      throw new BadRequestException('Media is not quarantined');
    }

    const updated = await this.prismaWrite.media.update({
      where: { id },
      data: { status: MediaStatus.READY },
    });

    await this.outboxService.createEvent({
      aggregateType: 'MEDIA',
      aggregateId: id,
      type: 'MEDIA_RELEASED',
      payload: { mediaId: id },
    });

    return updated;
  }

  private jobContextFromMedia(media: { contextType?: string | null }) {
    if (media.contextType === 'message' || media.contextType === 'thread') {
      return MediaJobContext.MESSAGE;
    }
    if (media.contextType === 'project') {
      return MediaJobContext.PROJECT;
    }
    return undefined;
  }
}
