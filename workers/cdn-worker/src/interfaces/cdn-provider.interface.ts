export interface InvalidationResult {
  id: string;
  status: string;
  paths: string[];
}

export interface CdnProvider {
  invalidate(paths: string[]): Promise<InvalidationResult>;
  purgeAll(): Promise<void>;
}
