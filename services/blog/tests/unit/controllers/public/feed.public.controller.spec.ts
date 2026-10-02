import { Test, TestingModule } from '@nestjs/testing';
import { FeedPublicController } from '../../../../src/controllers/public/feed.public.controller';
import { FeedService } from '../../../../src/services/feed.service';

describe('FeedPublicController', () => {
  let controller: FeedPublicController;
  let feedService: jest.Mocked<FeedService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeedPublicController],
      providers: [
        {
          provide: FeedService,
          useValue: {
            generateRss: jest.fn(),
            generateAtom: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<FeedPublicController>(FeedPublicController);
    feedService = module.get(FeedService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getRss', () => {
    it('should set headers and send rss feed', async () => {
      const feedXml = '<rss></rss>';
      feedService.generateRss.mockResolvedValue(feedXml);

      const mockRes = {
        header: jest.fn(),
        send: jest.fn(),
      };

      await controller.getRss(mockRes);

      expect(feedService.generateRss).toHaveBeenCalled();
      expect(mockRes.header).toHaveBeenCalledWith('Content-Type', 'application/rss+xml');
      expect(mockRes.header).toHaveBeenCalledWith(
        'Cache-Control',
        expect.stringContaining('s-maxage=300'),
      );
      expect(mockRes.send).toHaveBeenCalledWith(feedXml);
    });
  });

  describe('getAtom', () => {
    it('should set headers and send atom feed', async () => {
      const atomXml = '<feed></feed>';
      feedService.generateAtom.mockResolvedValue(atomXml);

      const mockRes = {
        header: jest.fn(),
        send: jest.fn(),
      };

      await controller.getAtom(mockRes);

      expect(feedService.generateAtom).toHaveBeenCalled();
      expect(mockRes.header).toHaveBeenCalledWith('Content-Type', 'application/atom+xml');
      expect(mockRes.header).toHaveBeenCalledWith(
        'Cache-Control',
        expect.stringContaining('s-maxage=300'),
      );
      expect(mockRes.send).toHaveBeenCalledWith(atomXml);
    });
  });
});
