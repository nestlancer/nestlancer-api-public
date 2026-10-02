export class UAParser {
  constructor() {}
  setUA(_ua: string) {
    return this;
  }
  getResult() {
    return this;
  }
  getBrowser() {
    return { name: 'Chrome', version: '100.0' };
  }
  getOS() {
    return { name: 'Mac OS', version: '12.0' };
  }
  getDevice() {
    return { model: 'Macintosh', type: 'desktop', vendor: 'Apple' };
  }
  getEngine() {
    return { name: 'Blink', version: '100.0' };
  }
  getCPU() {
    return { architecture: 'amd64' };
  }
}
export default UAParser;
