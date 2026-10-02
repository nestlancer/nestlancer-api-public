import { AdminMediaReferencesService } from '../../../src/media/media-admin-references.service';

describe('AdminMediaReferencesService', () => {
  let service: AdminMediaReferencesService;
  let mockPrismaRead: any;

  beforeEach(() => {
    mockPrismaRead = {
      media: {
        findUnique: jest.fn().mockResolvedValue({
          contextType: 'project',
          contextId: 'project-1',
          filename: 'file.png',
        }),
      },
      portfolioImage: { findMany: jest.fn().mockResolvedValue([]) },
      portfolioItem: { findMany: jest.fn().mockResolvedValue([]) },
      blogPost: { findMany: jest.fn().mockResolvedValue([]) },
      mediaShareLink: { findMany: jest.fn().mockResolvedValue([]) },
      message: { findMany: jest.fn().mockResolvedValue([]) },
      $queryRaw: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 'progress-1', type: 'UPDATE', projectId: 'project-1' }]),
    };

    service = new AdminMediaReferencesService(mockPrismaRead);
  });

  it('returns references including progress entries from attachmentIds query', async () => {
    const result = await service.findReferences('media-1');

    expect(result.referenceCount).toBe(2);
    expect(result.references).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'project', resourceId: 'project-1' }),
        expect.objectContaining({ type: 'progress', resourceId: 'progress-1' }),
      ]),
    );
    expect(mockPrismaRead.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { type: 'FILE' } }),
    );
  });
});
