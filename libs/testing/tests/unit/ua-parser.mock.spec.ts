import UAParser from '../../src/ua-parser.mock';

describe('UAParser Mock', () => {
  let parser: UAParser;

  beforeEach(() => {
    parser = new UAParser();
  });

  it('should allow chaining setUA', () => {
    expect(parser.setUA('some-agent')).toBe(parser);
  });

  it('should return self on getResult', () => {
    expect(parser.getResult()).toBe(parser);
  });

  it('should return static browser info', () => {
    expect(parser.getBrowser()).toEqual({ name: 'Chrome', version: '100.0' });
  });

  it('should return static OS info', () => {
    expect(parser.getOS()).toEqual({ name: 'Mac OS', version: '12.0' });
  });

  it('should return static device info', () => {
    expect(parser.getDevice()).toEqual({ model: 'Macintosh', type: 'desktop', vendor: 'Apple' });
  });

  it('should return static engine info', () => {
    expect(parser.getEngine()).toEqual({ name: 'Blink', version: '100.0' });
  });

  it('should return static CPU info', () => {
    expect(parser.getCPU()).toEqual({ architecture: 'amd64' });
  });
});
