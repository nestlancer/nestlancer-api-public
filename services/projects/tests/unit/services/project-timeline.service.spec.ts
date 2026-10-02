import { ProjectTimelineService } from '../../../src/services/project-timeline.service';

describe('ProjectTimelineService', () => {
  let service: ProjectTimelineService;
  let mockPrismaRead: any;

  const mockProject = { id: 'proj-1', userId: 'user-1', createdAt: new Date('2025-01-01') };

  beforeEach(() => {
    mockPrismaRead = {
      project: { findFirst: jest.fn().mockResolvedValue(mockProject) },
      progressEntry: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'pe-1',
            type: 'milestone',
            title: 'Design Complete',
            description: 'Design phase done',
            createdAt: new Date('2025-02-01'),
          },
          {
            id: 'pe-2',
            type: 'update',
            title: 'Dev Progress',
            description: '50% done',
            createdAt: new Date('2025-03-01'),
          },
        ]),
      },
    };
    service = new ProjectTimelineService(mockPrismaRead);
  });

  describe('getTimeline', () => {
    it('should return timeline events sorted by date', async () => {
      const result = await service.getTimeline('user-1', 'proj-1');
      expect(result.projectId).toBe('proj-1');
      expect(result.events.length).toBeGreaterThanOrEqual(3); // 2 progress + 1 creation
      // Should be sorted newest first
      expect(result.events[0].timestamp.getTime()).toBeGreaterThanOrEqual(
        result.events[result.events.length - 1].timestamp.getTime(),
      );
    });

    it('should include project creation event', async () => {
      const result = await service.getTimeline('user-1', 'proj-1');
      const creationEvent = result.events.find((e: any) => e.type === 'projectCreated');
      expect(creationEvent).toBeDefined();
      expect(creationEvent.title).toBe('Project Created');
    });

    it('should throw for non-existent project', async () => {
      mockPrismaRead.project.findFirst.mockResolvedValue(null);
      await expect(service.getTimeline('user-1', 'invalid')).rejects.toThrow();
    });

    it('should return empty events for new project', async () => {
      mockPrismaRead.progressEntry.findMany.mockResolvedValue([]);
      const result = await service.getTimeline('user-1', 'proj-1');
      expect(result.events).toHaveLength(1); // Just creation event
    });

    it('should only query client-visible progress entries', async () => {
      await service.getTimeline('user-1', 'proj-1');
      expect(mockPrismaRead.progressEntry.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            projectId: 'proj-1',
            visibility: { in: ['client', 'CLIENT_VISIBLE'] },
          }),
        }),
      );
    });
  });
});
