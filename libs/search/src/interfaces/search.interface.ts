export interface SearchOptions {
  query: string;
  filters?: Record<string, unknown>;
  sort?: string[];
  page?: number;
  limit?: number;
  attributes?: string[];
}
export interface SearchResult<T> {
  hits: T[];
  totalHits: number;
  processingTimeMs: number;
  page: number;
  limit: number;
}
