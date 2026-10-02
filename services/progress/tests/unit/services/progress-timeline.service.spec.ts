import { ProgressTimelineService } from '../../../src/services/progress-timeline.service';

describe('ProgressTimelineService', () => {
  let service: ProgressTimelineService;
  let mockPrismaRead: any;

  beforeEach(() => {
    mockPrismaRead = {
      progressEntry: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'pe-1',
            type: 'UPDATE',
            title: 'Progress Update',
            description: 'Half done',
            createdAt: new Date(),
            milestone: { id: 'ms-1', name: 'Design' },
          },
        ]),
        count: jest.fn().mockResolvedValue(1),
      },
    };
    service = new ProgressTimelineService(mockPrismaRead);
  });

  describe('getTimeline', () => {
    it('should return paginated timeline entries', async () => {
      const result = await service.getTimeline('proj-1', { page: 1, limit: 20 } as any);
      expect(result.items).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('should format entries as timeline items', async () => {
      const result = await service.getTimeline('proj-1', {} as any);
      expect(result.items[0].type).toBe('PROGRESS');
      expect(result.items[0].title).toBe('Progress Update');
      expect(result.items[0].metadata.milestone).toBeDefined();
    });

    it('should handle empty timeline', async () => {
      mockPrismaRead.progressEntry.findMany.mockResolvedValue([]);
      mockPrismaRead.progressEntry.count.mockResolvedValue(0);
      const result = await service.getTimeline('proj-1', { page: 1, limit: 20 } as any);
      expect(result.items).toHaveLength(0);
      expect(result.meta.totalPages).toBe(0);
    });

    it('should use default pagination values', async () => {
      await service.getTimeline('proj-1', {} as any);
      expect(mockPrismaRead.progressEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });
  });
});
