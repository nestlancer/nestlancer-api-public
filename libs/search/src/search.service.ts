import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MeiliSearch, Index } from 'meilisearch';
import { SearchOptions, SearchResult } from './interfaces/search.interface';

@Injectable()
export class SearchService implements OnModuleInit {
  private readonly logger = new Logger(SearchService.name);
  private client!: MeiliSearch;

  onModuleInit(): void {
    const host = process.env.MEILISEARCH_URL || 'http://localhost:7700';
    const apiKey = process.env.MEILISEARCH_MASTER_KEY || '';

    this.client = new MeiliSearch({ host, apiKey });
    this.logger.log(`SearchService connected to Meilisearch at ${host}`);
  }

  private getIndex(indexName: string): Index {
    return this.client.index(indexName);
  }

  async search<T>(index: string, options: SearchOptions): Promise<SearchResult<T>> {
    this.logger.debug(`Searching ${index}: "${options.query}"`);

    const searchParams: Record<string, unknown> = {
      limit: options.limit || 20,
      offset: ((options.page || 1) - 1) * (options.limit || 20),
    };

    if (options.filters) {
      const filterParts: string[] = [];
      for (const [key, value] of Object.entries(options.filters)) {
        if (Array.isArray(value)) {
          filterParts.push(`${key} IN [${value.map((v) => `"${v}"`).join(', ')}]`);
        } else if (typeof value === 'string') {
          filterParts.push(`${key} = "${value}"`);
        } else {
          filterParts.push(`${key} = ${value}`);
        }
      }
      searchParams.filter = filterParts;
    }

    if (options.sort && options.sort.length > 0) {
      searchParams.sort = options.sort;
    }

    if (options.attributes && options.attributes.length > 0) {
      searchParams.attributesToRetrieve = options.attributes;
    }

    const result = await this.getIndex(index).search(options.query, searchParams);

    return {
      hits: result.hits as T[],
      totalHits: result.estimatedTotalHits || 0,
      processingTimeMs: result.processingTimeMs,
      page: options.page || 1,
      limit: options.limit || 20,
    };
  }

  /**
   * Create an index with optional primary key and searchable/filterable attributes.
   */
  async createIndex(
    indexName: string,
    primaryKey?: string,
    config?: {
      searchableAttributes?: string[];
      filterableAttributes?: string[];
      sortableAttributes?: string[];
    },
  ): Promise<void> {
    await this.client.createIndex(indexName, { primaryKey });
    this.logger.log(`Created search index: ${indexName}`);

    const index = this.getIndex(indexName);

    if (config?.searchableAttributes) {
      await index.updateSearchableAttributes(config.searchableAttributes);
    }
    if (config?.filterableAttributes) {
      await index.updateFilterableAttributes(config.filterableAttributes);
    }
    if (config?.sortableAttributes) {
      await index.updateSortableAttributes(config.sortableAttributes);
    }
  }
}
