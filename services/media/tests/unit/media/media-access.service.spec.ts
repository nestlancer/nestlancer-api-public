import { MediaAccessService } from '../../../src/media/media-access.service';

describe('MediaAccessService', () => {
  let service: MediaAccessService;
  let prismaRead: {
    project: { findUnique: jest.Mock; findMany: jest.Mock };
    chatThreadMember: { findUnique: jest.Mock };
    message: { findUnique: jest.Mock };
    milestone: { findMany: jest.Mock };
    deliverable: { findMany: jest.Mock };
  };

  beforeEach(() => {
    prismaRead = {
      project: { findUnique: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      chatThreadMember: { findUnique: jest.fn() },
      message: { findUnique: jest.fn() },
      milestone: { findMany: jest.fn().mockResolvedValue([]) },
      deliverable: { findMany: jest.fn().mockResolvedValue([]) },
    };
    service = new MediaAccessService(prismaRead as any);
  });

  it('allows uploader access', async () => {
    const allowed = await service.canAccessMedia('user-1', {
      uploaderId: 'user-1',
      contextType: null,
      contextId: null,
    });
    expect(allowed).toBe(true);
  });

  it('denies project client for PRIVATE non-owned media (NL-BUG-DEL-1)', async () => {
    prismaRead.project.findUnique.mockResolvedValue({
      clientId: 'user-2',
      adminId: 'admin-1',
      deletedAt: null,
    });
    const allowed = await service.canAccessMedia('user-2', {
      id: 'media-ssh',
      uploaderId: 'admin-1',
      contextType: 'project',
      contextId: 'proj-1',
      visibility: 'PRIVATE',
    });
    expect(allowed).toBe(false);
  });

  it('allows project client for PUBLIC project media', async () => {
    prismaRead.project.findUnique.mockResolvedValue({
      clientId: 'user-2',
      adminId: 'admin-1',
      deletedAt: null,
    });
    const allowed = await service.canAccessMedia('user-2', {
      id: 'media-public',
      uploaderId: 'admin-1',
      contextType: 'project',
      contextId: 'proj-1',
      visibility: 'PUBLIC',
    });
    expect(allowed).toBe(true);
  });

  it('allows thread member for thread context', async () => {
    prismaRead.chatThreadMember.findUnique.mockResolvedValue({ threadId: 't-1', userId: 'user-2' });
    const allowed = await service.canAccessMedia('user-2', {
      uploaderId: 'user-1',
      contextType: 'thread',
      contextId: 't-1',
    });
    expect(allowed).toBe(true);
  });

  it('allows message recipient via thread membership', async () => {
    prismaRead.message.findUnique.mockResolvedValue({
      senderId: 'user-1',
      threadId: 't-1',
      projectId: null,
      deletedAt: null,
    });
    prismaRead.chatThreadMember.findUnique.mockResolvedValue({ threadId: 't-1', userId: 'user-2' });

    const allowed = await service.canAccessMedia('user-2', {
      uploaderId: 'user-1',
      contextType: 'message',
      contextId: 'msg-1',
    });
    expect(allowed).toBe(true);
  });

  it('denies outsider for message context', async () => {
    prismaRead.message.findUnique.mockResolvedValue({
      senderId: 'user-1',
      threadId: 't-1',
      projectId: null,
      deletedAt: null,
    });
    prismaRead.chatThreadMember.findUnique.mockResolvedValue(null);

    const allowed = await service.canAccessMedia('user-3', {
      uploaderId: 'user-1',
      contextType: 'message',
      contextId: 'msg-1',
    });
    expect(allowed).toBe(false);
  });
});
