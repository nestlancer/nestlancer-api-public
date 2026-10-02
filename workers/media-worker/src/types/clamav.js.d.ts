declare module 'clamav.js' {
  interface ClamavScanner {
    scan(
      path: string,
      callback: (
        err: Error | null,
        object: unknown,
        result: { status?: string; virus?: string },
      ) => void,
    ): void;
  }

  interface ClamavClient {
    createScanner(host: string, port: number): ClamavScanner;
  }

  const clamav: ClamavClient;
  export default clamav;
}
