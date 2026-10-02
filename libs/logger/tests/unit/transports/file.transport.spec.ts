import { FileTransport } from '../../../src/transports/file.transport';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('fs');
jest.mock('path');

describe('FileTransport', () => {
  const mockFilePath = '/tmp/logs/app.log';

  beforeEach(() => {
    jest.clearAllMocks();
    (path.dirname as jest.Mock).mockReturnValue('/tmp/logs');
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.statSync as jest.Mock).mockReturnValue({ size: 100 });
  });

  it('should create directory if it does not exist', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false); // Dir doesn't exist

    new FileTransport({ filePath: mockFilePath });

    expect(fs.mkdirSync).toHaveBeenCalledWith('/tmp/logs', { recursive: true });
  });

  it('should write output to file with newline', () => {
    const transport = new FileTransport({ filePath: mockFilePath });
    transport.write('Test log');

    expect(fs.appendFileSync).toHaveBeenCalledWith(mockFilePath, 'Test log\n');
  });

  it('should rotate files when size exceeds maxSizeBytes', () => {
    // Mock file size to be larger than max (1000)
    (fs.statSync as jest.Mock).mockReturnValue({ size: 2000 });

    // Mock existence: app.log exists, app.log.1 exists, app.log.2 doesn't
    (fs.existsSync as jest.Mock).mockImplementation((p: fs.PathLike) => {
      if (p === mockFilePath || p === `${mockFilePath}.1`) return true;
      return false; // For .2, .3, etc.
    });

    const transport = new FileTransport({
      filePath: mockFilePath,
      maxSizeBytes: 1000,
      maxFiles: 3,
    });
    transport.write('Trigger rotation');

    // It should rename app.log.1 -> app.log.2
    expect(fs.renameSync).toHaveBeenCalledWith(`${mockFilePath}.1`, `${mockFilePath}.2`);
    // Then append to app.log (which would normally be truncated in a real logger, but this basic implementation just appends)
    expect(fs.appendFileSync).toHaveBeenCalledWith(mockFilePath, 'Trigger rotation\n');
  });

  it('should not throw if rotation fails', () => {
    (fs.statSync as jest.Mock).mockImplementation(() => {
      throw new Error('Permission denied');
    });

    const transport = new FileTransport({ filePath: mockFilePath });
    expect(() => transport.write('Test log')).not.toThrow();
    expect(fs.appendFileSync).toHaveBeenCalledWith(mockFilePath, 'Test log\n');
  });
});
