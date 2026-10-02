import { MediaLibraryScopeService } from '../../../src/media/media-library-scope.service';

describe('MediaLibraryScopeService', () => {
  let service: MediaLibraryScopeService;
  let prismaRead: any;
  let prismaWrite: any;

  beforeEach(() => {
    prismaRead = {
      project: {
        findMany: jest.fn().mockResolvedValue([{ id: 'proj-1' }]),
      },
      chatThreadMember: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      milestone: {
        findMany: jest.fn().mockResolvedValue([{ id: 'ms-1' }]),
      },
      deliverable: {
        findMany: jest.fn().mockResolvedValue([{ attachments: ['del-media-1'] }]),
      },
      message: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'msg-1',
            type: 'FILE',
            content: JSON.stringify({ mediaId: 'msg-media-1' }),
          },
        ]),
      },
      media: {
        groupBy: jest.fn().mockResolvedValue([]),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    prismaWrite = {
      media: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const cache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    };
    service = new MediaLibraryScopeService(prismaRead, prismaWrite, cache as any);
  });

  it('skips related-id fan-out for uploads-only library views', async () => {
    await service.buildLibraryWhere('user-1', { source: 'uploads' });
    expect(prismaRead.project.findMany).not.toHaveBeenCalled();
    expect(prismaRead.chatThreadMember.findMany).not.toHaveBeenCalled();
  });

  it('includes owned, project, delivery, and message media in library where', async () => {
    const where = (await service.buildLibraryWhere('user-1', { source: 'all' })) as {
      AND?: unknown[];
      OR?: unknown[];
    };
    const accessOr = Array.isArray(where.AND)
      ? (where.AND[0] as { OR?: unknown[] }).OR
      : where.OR;
    expect(accessOr).toEqual(
      expect.arrayContaining([
        { uploaderId: 'user-1' },
        { contextType: 'project', contextId: { in: ['proj-1'] } },
        { id: { in: ['del-media-1'] } },
        { id: { in: ['msg-media-1'] } },
      ]),
    );
  });

  it('filters to delivery attachments only', async () => {
    const where = (await service.buildLibraryWhere('user-1', { source: 'delivery' })) as {
      AND?: unknown[];
    };
    expect(where.AND).toEqual(
      expect.arrayContaining([{ id: { in: ['del-media-1'] } }]),
    );
  });

  it('builds global admin delivery where from deliverable attachments', async () => {
    const where = await service.buildAdminSourceWhere({ source: 'delivery' });
    expect(where).toEqual({
      AND: [
        { id: { in: ['del-media-1'] } },
        {
          status: { in: ['READY', 'PROCESSING', 'FAILED', 'QUARANTINED'] },
        },
      ],
    });
  });

  it('backfills project context onto deliverable media', async () => {
    prismaRead.deliverable.findMany.mockResolvedValueOnce([
      {
        attachments: ['del-media-1'],
        milestone: { projectId: 'proj-1' },
      },
    ]);
    const result = await service.backfillDeliverableMediaContext();
    expect(result.updated).toBe(1);
    expect(prismaWrite.media.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { contextType: 'project', contextId: 'proj-1' },
      }),
    );
  });
});
