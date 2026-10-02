import { Test, TestingModule } from '@nestjs/testing';
import { EmailRendererService } from '../../../src/services/email-renderer.service';
import { ConfigService } from '@nestjs/config';
import { ResourceNotFoundException } from '@nestlancer/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as handlebars from 'handlebars';

jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  readdir: jest.fn(),
}));

jest.mock('handlebars', () => ({
  compile: jest.fn().mockReturnValue((data: any) => `compiled_with_${JSON.stringify(data)}`),
}));

describe('EmailRendererService', () => {
  let service: EmailRendererService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailRendererService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('/test/templates') },
        },
      ],
    }).compile();

    service = module.get<EmailRendererService>(EmailRendererService);
    configService = module.get(ConfigService);

    // Reset mocks
    (fs.readFile as jest.Mock).mockReset();
    (fs.readdir as jest.Mock).mockReset();
    (handlebars.compile as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit & loadTemplates', () => {
    it('should load templates and base layout', async () => {
      process.env.TEMPLATES_PATH = '/test/templates';
      (fs.readFile as jest.Mock).mockResolvedValue('template content');
      (fs.readdir as jest.Mock).mockResolvedValue(['welcome.hbs', 'other.txt']);

      await service.onModuleInit();

      // layout
      expect(fs.readFile).toHaveBeenCalledWith(
        path.join('/test/templates', 'layouts', 'base.hbs'),
        'utf8',
      );

      // template dir
      expect(fs.readdir).toHaveBeenCalledWith('/test/templates');
      expect(fs.readFile).toHaveBeenCalledWith(path.join('/test/templates', 'welcome.hbs'), 'utf8');

      expect(handlebars.compile).toHaveBeenCalledTimes(2); // layout + welcome template
    });

    it('should fallback to default templates path if not configured', async () => {
      configService.get.mockReturnValueOnce(undefined);
      delete process.env.TEMPLATES_PATH;
      await service.onModuleInit();
      expect(fs.readdir).toHaveBeenCalledWith('./src/templates');
    });

    it('should handle errors during loading', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('File not found'));
      await expect(service.onModuleInit()).resolves.not.toThrow();
    });
  });

  describe('render', () => {
    it('should throw ResourceNotFoundException if template not found', async () => {
      await expect(service.render('unknown_template', {})).rejects.toThrow(
        ResourceNotFoundException,
      );
    });

    it('should render template with layout', async () => {
      // First load templates
      (fs.readFile as jest.Mock).mockResolvedValue('template content');
      (fs.readdir as jest.Mock).mockResolvedValue(['welcome.hbs']);
      await service.onModuleInit();

      const result = await service.render('welcome', { name: 'Test' });

      // Since mock returns `compiled_with_${JSON.stringify(data)}`
      // and base layout calls with { ...data, body: ... }
      expect(result).toContain('compiled_with_');
      expect(result).toContain('name":"Test"');
      expect(result).toContain('body":"compiled_with_'); // template within layout
    });

    it('should return just body if no base layout', async () => {
      (fs.readFile as jest.Mock).mockImplementation((filepath) => {
        if (filepath.includes('base.hbs')) return Promise.reject(new Error('no layout'));
        return Promise.resolve('template content');
      });
      (fs.readdir as jest.Mock).mockResolvedValue(['welcome.hbs']);
      await service.onModuleInit();

      const result = await service.render('welcome', { name: 'Test' });
      expect(result).toEqual('compiled_with_{"name":"Test"}');
    });

    it('should skip templates that fail to load but load others', async () => {
      (fs.readFile as jest.Mock).mockImplementation((filepath) => {
        if (filepath.includes('welcome.hbs')) return Promise.resolve('welcome content');
        if (filepath.includes('broken.hbs')) return Promise.reject(new Error('broken file'));
        return Promise.resolve('layout content');
      });
      (fs.readdir as jest.Mock).mockResolvedValue(['welcome.hbs', 'broken.hbs']);
      await service.onModuleInit();

      expect(await service.render('welcome', { name: 'Test' })).toBeDefined();
      await expect(service.render('broken', {})).rejects.toThrow(ResourceNotFoundException);
    });
  });
});
