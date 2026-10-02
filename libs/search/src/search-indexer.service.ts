import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MeiliSearch } from 'meilisearch';

@Injectable()
export class SearchIndexerService implements OnModuleInit {
  private readonly logger = new Logger(SearchIndexerService.name);
  private client!: MeiliSearch;

  onModuleInit(): void {
    const host = process.env.MEILISEARCH_URL || 'http://localhost:7700';
    const apiKey = process.env.MEILISEARCH_MASTER_KEY || '';
    this.client = new MeiliSearch({ host, apiKey });
  }

  /**
   * Index a single document.
   */
  async index(indexName: string, id: string, document: Record<string, unknown>): Promise<void> {
    this.logger.debug(`Indexing ${indexName}:${id}`);
    const index = this.client.index(indexName);
    await index.addDocuments([{ id, ...document }], { primaryKey: 'id' });
  }

  /**
   * Index multiple documents in batch.
   */
  async indexBatch(
    indexName: string,
    documents: Array<Record<string, unknown>>,
    primaryKey: string = 'id',
  ): Promise<void> {
    this.logger.debug(`Batch indexing ${documents.length} documents to ${indexName}`);
    const index = this.client.index(indexName);
    await index.addDocuments(documents, { primaryKey });
  }

  /**
   * Remove a single document from the index.
   */
  async remove(indexName: string, id: string): Promise<void> {
    this.logger.debug(`Removing from index ${indexName}:${id}`);
    const index = this.client.index(indexName);
    await index.deleteDocument(id);
  }

  /**
   * Remove multiple documents from the index.
   */
  async removeBatch(indexName: string, ids: string[]): Promise<void> {
    this.logger.debug(`Batch removing ${ids.length} documents from ${indexName}`);
    const index = this.client.index(indexName);
    await index.deleteDocuments(ids);
  }

  /**
   * Update a single document (partial update).
   */
  async update(indexName: string, id: string, document: Record<string, unknown>): Promise<void> {
    this.logger.debug(`Updating ${indexName}:${id}`);
    const index = this.client.index(indexName);
    await index.updateDocuments([{ id, ...document }], { primaryKey: 'id' });
  }
}
