export type CdnJobType = 'INVALIDATE_PATH' | 'INVALIDATE_BATCH' | 'PURGE_ALL';

export interface CdnJob {
  type: CdnJobType;
  paths?: string[];
}
