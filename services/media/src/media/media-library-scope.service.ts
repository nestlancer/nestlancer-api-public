import { Injectable, Logger } from '@nestjs/common';

import { CacheService } from '@nestlancer/cache';
import { PrismaReadService, PrismaWriteService, ReadOnly } from '@nestlancer/database';

import { FileType, MediaStatus } from '../interfaces/media.interface';
import { buildMediaWhereClause } from './media-admin-query.util';

export type LibrarySourceFilter =
  | 'all'
  | 'uploads'
  | 'message'
  | 'project'
  | 'delivery'
  | 'folder'
  | 'ungrouped';

export type LibraryScopeFilters = {
  fileType?: FileType;
  status?: string;
  search?: string;
  /** Source filter — maps from contextType query param. */
  source?: LibrarySourceFilter;
  contextId?: string;
};

/** Statuses shown in libraries (hide abandoned PENDING/UPLOADING stubs by default). */
const LIBRARY_LISTABLE_STATUSES: MediaStatus[] = [
  MediaStatus.READY,
  MediaStatus.PROCESSING,
  MediaStatus.FAILED,
  MediaStatus.QUARANTINED,
];

function listableStatusWhere(ownerUserId?: string): Record<string, unknown> {
  if (!ownerUserId) {
    return { status: { in: LIBRARY_LISTABLE_STATUSES } };
  }
  // Own in-progress uploads stay visible; everyone else's PENDING stubs stay hidden.
  return {
    OR: [
      { status: { in: LIBRARY_LISTABLE_STATUSES } },
      {
        AND: [
          { uploaderId: ownerUserId },
          { status: { in: [MediaStatus.PENDING, MediaStatus.UPLOADING] } },
        ],
      },
    ],
  };
}

type RelatedIds = {
  projectIds: string[];
  threadIds: string[];
  messageIds: string[];
  deliverableMediaIds: string[];
  messageMediaIds: string[];
};

/**
 * Builds Prisma where-clauses for:
 * - Client "library" (files the user owns or can access via projects/messages/deliveries)
 * - Admin "related to user" (same related set for a given client account)
 *
 * Ownership (uploaderId / S3 key) is unchanged — this only controls listing visibility.
 */
@Injectable()
export class MediaLibraryScopeService {
  private readonly logger = new Logger(MediaLibraryScopeService.name);
  /** Process-local fallback when Redis is briefly unavailable. */
  private readonly relatedMemCache = new Map<string, { expiresAt: number; value: RelatedIds }>();
  private static readonly RELATED_TTL_SEC = 60;
  private static readonly RELATED_CACHE_PREFIX = 'media:related:';

  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly prismaWrite: PrismaWriteService,
    private readonly cache: CacheService,
  ) {}

  @ReadOnly()
  async buildLibraryWhere(userId: string, filters: LibraryScopeFilters = {}) {
    const source = normalizeSource(filters.source);
    // Uploads / folder views only need ownership — skip project/message fan-out (NL-PERF-MEDIA-001).
    if (source === 'uploads' || source === 'ungrouped' || source === 'folder') {
      return this.composeWhere(userId, EMPTY_RELATED, filters);
    }
    const related = await this.getRelatedIdsCached(userId);
    return this.composeWhere(userId, related, filters);
  }

  private async getRelatedIdsCached(userId: string): Promise<RelatedIds> {
    const key = `${MediaLibraryScopeService.RELATED_CACHE_PREFIX}${userId}`;
    const now = Date.now();

    const mem = this.relatedMemCache.get(userId);
    if (mem && mem.expiresAt > now) {
      return mem.value;
    }

    try {
      const cached = await this.cache.get<RelatedIds>(key);
      if (cached?.projectIds) {
        this.relatedMemCache.set(userId, {
          expiresAt: now + MediaLibraryScopeService.RELATED_TTL_SEC * 1000,
          value: cached,
        });
        return cached;
      }
    } catch (error: unknown) {
      this.logger.warn(
        `Related-ids cache read failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    const value = await this.collectRelatedIds(userId);
    this.relatedMemCache.set(userId, {
      expiresAt: now + MediaLibraryScopeService.RELATED_TTL_SEC * 1000,
      value,
    });
    if (this.relatedMemCache.size > 500) {
      for (const [k, v] of this.relatedMemCache) {
        if (v.expiresAt <= now) this.relatedMemCache.delete(k);
      }
    }
    try {
      await this.cache.set(key, value, MediaLibraryScopeService.RELATED_TTL_SEC);
    } catch (error: unknown) {
      this.logger.warn(
        `Related-ids cache write failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return value;
  }

  /** Alias used by admin when opening a client's storage inventory. */
  @ReadOnly()
  async buildRelatedToUserWhere(userId: string, filters: LibraryScopeFilters = {}) {
    return this.buildLibraryWhere(userId, filters);
  }

  /**
   * Admin global source filters (no relatedToUserId) — resolve delivery/message/project
   * via references, not only Media.contextType (which is often null for deliverables).
   */
  @ReadOnly()
  async buildAdminSourceWhere(filters: LibraryScopeFilters = {}) {
    const source = normalizeSource(filters.source);
    const baseFilters = buildMediaWhereClause({
      fileType: filters.fileType,
      status: filters.status,
      search: filters.search,
      contextId: filters.contextId,
    });

    let sourceWhere: Record<string, unknown>;
    switch (source) {
      case 'delivery': {
        const ids = await this.collectAllDeliverableMediaIds();
        sourceWhere = ids.length > 0 ? { id: { in: ids } } : { id: '__none__' };
        break;
      }
      case 'message': {
        const ids = await this.collectAllMessageMediaIds();
        sourceWhere = {
          OR: [
            { contextType: { in: ['message', 'thread'] } },
            ...(ids.length > 0 ? [{ id: { in: ids } }] : []),
          ],
        };
        break;
      }
      case 'project': {
        const deliveryIds = await this.collectAllDeliverableMediaIds();
        sourceWhere = {
          OR: [
            { contextType: 'project' },
            ...(deliveryIds.length > 0 ? [{ id: { in: deliveryIds } }] : []),
          ],
        };
        break;
      }
      case 'uploads':
      case 'ungrouped':
        sourceWhere = {
          OR: [{ contextType: null }, { contextType: 'folder' }],
        };
        break;
      case 'folder':
        sourceWhere = { contextType: 'folder' };
        break;
      default:
        sourceWhere = {};
    }

    const parts: Record<string, unknown>[] = [];
    if (Object.keys(sourceWhere).length > 0) parts.push(sourceWhere);
    // When caller didn't pin an explicit status, hide PENDING/UPLOADING stubs.
    if (!filters.status) parts.push(listableStatusWhere());
    if (Object.keys(baseFilters).length > 0) parts.push(baseFilters);

    if (parts.length === 0) return {};
    return parts.length === 1 ? parts[0] : { AND: parts };
  }

  /** Backfill Media.contextType/contextId from deliverable → milestone → project. */
  async backfillDeliverableMediaContext(): Promise<{ updated: number }> {
    const deliverables = await this.prismaRead.deliverable.findMany({
      select: {
        attachments: true,
        milestone: { select: { projectId: true } },
      },
    });

    const byProject = new Map<string, string[]>();
    for (const row of deliverables) {
      const projectId = row.milestone?.projectId;
      if (!projectId || !Array.isArray(row.attachments)) continue;
      const list = byProject.get(projectId) ?? [];
      for (const id of row.attachments) {
        if (id != null && String(id).length > 0) list.push(String(id));
      }
      byProject.set(projectId, list);
    }

    let updated = 0;
    for (const [projectId, mediaIds] of byProject) {
      const unique = [...new Set(mediaIds)];
      if (unique.length === 0) continue;
      const result = await this.prismaWrite.media.updateMany({
        where: {
          id: { in: unique },
          OR: [{ contextType: null }, { contextId: null }],
        },
        data: {
          contextType: 'project',
          contextId: projectId,
        },
      });
      updated += result.count;
    }
    return { updated };
  }

  /**
   * Accessible library counts/sizes per user (owned + project/delivery/message refs).
   * Matches client Settings→Files inventory (NL-ADMIN-005 / NL-MEDIA-001).
   */
  @ReadOnly()
  async countAccessibleMediaForUsers(
    userIds: string[],
  ): Promise<Map<string, { count: number; totalSize: number }>> {
    const out = new Map<string, { count: number; totalSize: number }>();
    if (userIds.length === 0) return out;

    await Promise.all(
      userIds.map(async (userId) => {
        const where = await this.buildLibraryWhere(userId, {});
        const [count, agg] = await Promise.all([
          this.prismaRead.media.count({ where }),
          this.prismaRead.media.aggregate({ where, _sum: { size: true } }),
        ]);
        out.set(userId, { count, totalSize: Number(agg._sum.size ?? 0) });
      }),
    );
    return out;
  }

  /**
   * Related media counts per client (owned + project/delivery/message refs).
   * Used to fix Private user sidebar showing 0 for clients who only have admin-uploaded deliverables.
   */
  @ReadOnly()
  async countRelatedMediaForUsers(userIds: string[]): Promise<Map<string, number>> {
    const accessible = await this.countAccessibleMediaForUsers(userIds);
    const counts = new Map<string, number>();
    for (const [id, v] of accessible) counts.set(id, v.count);
    return counts;
  }

  private async collectAllDeliverableMediaIds(): Promise<string[]> {
    const deliverables = await this.prismaRead.deliverable.findMany({
      select: { attachments: true },
          take: 2000,
    });
    const ids = new Set<string>();
    for (const row of deliverables) {
      if (!Array.isArray(row.attachments)) continue;
      for (const id of row.attachments) {
        if (id != null && String(id).length > 0) ids.add(String(id));
      }
    }
    return [...ids];
  }

  private async collectAllMessageMediaIds(): Promise<string[]> {
    const messages = await this.prismaRead.message.findMany({
      where: { type: 'FILE', deletedAt: null },
      select: { content: true },
      take: 2000,
    });
    const ids = new Set<string>();
    for (const msg of messages) {
      if (!msg.content) continue;
      const mediaId = extractMediaIdFromMessageContent(msg.content);
      if (mediaId) ids.add(mediaId);
    }
    return [...ids];
  }

  private async collectRelatedIds(userId: string): Promise<RelatedIds> {
    // Fan out independent lookups in parallel (was sequential: project → threads → …).
    const [projects, memberships] = await Promise.all([
      this.prismaRead.project.findMany({
        where: {
          deletedAt: null,
          OR: [{ clientId: userId }, { adminId: userId }],
        },
        select: { id: true },
      }),
      this.prismaRead.chatThreadMember.findMany({
        where: { userId },
        select: { threadId: true },
      }),
    ]);
    const projectIds = projects.map((p) => p.id);
    const threadIds = memberships.map((m) => m.threadId);

    const deliverableMediaIds = new Set<string>();
    const messageMediaIds = new Set<string>();
    const messageIds: string[] = [];

    if (projectIds.length === 0 && threadIds.length === 0) {
      return {
        projectIds,
        threadIds,
        messageIds,
        deliverableMediaIds: [] as string[],
        messageMediaIds: [] as string[],
      };
    }

    // Messages do not depend on milestones — run both in parallel to cut one DB RTT.
    const messageWhere =
      projectIds.length > 0
        ? {
            deletedAt: null as null,
            type: 'FILE' as const,
            OR: [
              { projectId: { in: projectIds } },
              ...(threadIds.length > 0 ? [{ threadId: { in: threadIds } }] : []),
            ],
          }
        : { threadId: { in: threadIds }, deletedAt: null as null, type: 'FILE' as const };

    const [milestones, messages] = await Promise.all([
      projectIds.length > 0
        ? this.prismaRead.milestone.findMany({
            where: { projectId: { in: projectIds } },
            select: { id: true },
          })
        : Promise.resolve([] as { id: string }[]),
      this.prismaRead.message.findMany({
        where: messageWhere,
        // Only FILE rows need contextId expansion for library access; TEXT/system inflate IN lists.
        select: { id: true, type: true, content: true },
        take: 500,
      }),
    ]);

    const milestoneIds = milestones.map((m) => m.id);
    const deliverables =
      milestoneIds.length > 0
        ? await this.prismaRead.deliverable.findMany({
            where: { milestoneId: { in: milestoneIds } },
            select: { attachments: true },
          })
        : [];

    for (const row of deliverables) {
      if (!Array.isArray(row.attachments)) continue;
      for (const id of row.attachments) {
        if (id != null && String(id).length > 0) {
          deliverableMediaIds.add(String(id));
        }
      }
    }
    for (const msg of messages) {
      if (msg.type === 'FILE') {
        messageIds.push(msg.id);
        if (msg.content) {
          const mediaId = extractMediaIdFromMessageContent(msg.content);
          if (mediaId) messageMediaIds.add(mediaId);
        }
      }
    }

    return {
      projectIds,
      threadIds,
      messageIds,
      deliverableMediaIds: [...deliverableMediaIds],
      messageMediaIds: [...messageMediaIds],
    };
  }

  private composeWhere(
    userId: string,
    related: RelatedIds,
    filters: LibraryScopeFilters,
  ) {
    const source = normalizeSource(filters.source);
    const baseFilters = buildMediaWhereClause({
      fileType: filters.fileType,
      status: filters.status,
      search: filters.search,
      contextId: filters.contextId,
    });

    // NL-BUG-DEL-1: own uploads always; project-context membership only for PUBLIC;
    // PRIVATE non-owned rows require an explicit share ref (deliverable / message media).
    const accessOr: Record<string, unknown>[] = [{ uploaderId: userId }];
    if (related.projectIds.length > 0) {
      accessOr.push({
        contextType: 'project',
        contextId: { in: related.projectIds },
        visibility: 'PUBLIC',
      });
    }
    if (related.threadIds.length > 0) {
      accessOr.push({
        contextType: 'thread',
        contextId: { in: related.threadIds },
      });
    }
    if (related.messageIds.length > 0) {
      accessOr.push({
        contextType: 'message',
        contextId: { in: related.messageIds },
      });
    }
    if (related.deliverableMediaIds.length > 0) {
      accessOr.push({ id: { in: related.deliverableMediaIds } });
    }
    if (related.messageMediaIds.length > 0) {
      accessOr.push({ id: { in: related.messageMediaIds } });
    }

    const accessWhere = { OR: accessOr };

    let sourceWhere: Record<string, unknown> | null = null;
    switch (source) {
      case 'uploads':
      case 'ungrouped':
        sourceWhere = {
          uploaderId: userId,
          OR: [{ contextType: null }, { contextType: 'folder' }],
        };
        break;
      case 'message':
        sourceWhere = {
          OR: [
            { contextType: { in: ['message', 'thread'] } },
            ...(related.messageMediaIds.length > 0
              ? [{ id: { in: related.messageMediaIds } }]
              : []),
          ],
        };
        break;
      case 'project':
        // Project work files include deliverable attachments even when context was never tagged.
        sourceWhere = {
          OR: [
            { contextType: 'project' },
            ...(related.deliverableMediaIds.length > 0
              ? [{ id: { in: related.deliverableMediaIds } }]
              : []),
            ...(related.projectIds.length > 0
              ? [{ contextType: 'project', contextId: { in: related.projectIds } }]
              : []),
          ],
        };
        if (!(sourceWhere.OR as unknown[]).length) {
          sourceWhere = { id: '__none__' };
        }
        break;
      case 'delivery':
        sourceWhere =
          related.deliverableMediaIds.length > 0
            ? { id: { in: related.deliverableMediaIds } }
            : { id: '__none__' };
        break;
      case 'folder':
        sourceWhere = { uploaderId: userId, contextType: 'folder' };
        break;
      default:
        sourceWhere = null;
    }

    const parts: Record<string, unknown>[] = [accessWhere];
    if (sourceWhere) parts.push(sourceWhere);
    // Hide abandoned PENDING/UPLOADING stubs; keep the viewer's own in-progress uploads.
    if (!filters.status) parts.push(listableStatusWhere(userId));
    if (Object.keys(baseFilters).length > 0) parts.push(baseFilters);

    return parts.length === 1 ? parts[0] : { AND: parts };
  }
}

const EMPTY_RELATED = {
  projectIds: [] as string[],
  threadIds: [] as string[],
  messageIds: [] as string[],
  deliverableMediaIds: [] as string[],
  messageMediaIds: [] as string[],
};

function normalizeSource(source?: string | null): LibrarySourceFilter {
  if (!source || source === 'all') return 'all';
  if (source === 'ungrouped') return 'ungrouped';
  if (source === 'uploads') return 'uploads';
  if (source === 'message' || source === 'thread') return 'message';
  if (source === 'project') return 'project';
  if (source === 'delivery' || source === 'deliverable') return 'delivery';
  if (source === 'folder') return 'folder';
  return 'all';
}

function extractMediaIdFromMessageContent(content: string): string | null {
  try {
    const parsed = JSON.parse(content) as { mediaId?: unknown };
    if (parsed?.mediaId != null && String(parsed.mediaId).length > 0) {
      return String(parsed.mediaId);
    }
  } catch {
    // plain-text message
  }
  return null;
}
