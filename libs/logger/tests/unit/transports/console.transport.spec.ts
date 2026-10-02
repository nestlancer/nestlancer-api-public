import { ConsoleTransport } from '../../../src/transports/console.transport';

describe('ConsoleTransport', () => {
  let transport: ConsoleTransport;

  beforeEach(() => {
    transport = new ConsoleTransport();
    jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should write output to process.stdout with newline', () => {
    const message = 'Test log message';
    transport.write(message);

    expect(process.stdout.write).toHaveBeenCalledWith(message + '\n');
  });
});
