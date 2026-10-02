import { Injectable } from '@nestjs/common';

import { PrismaReadService } from '@nestlancer/database';

/**
 * Service responsible for performing complex data aggregations using Prisma.
 * Provides a high-level API for grouped metrics and raw SQL execution.
 */
@Injectable()
export class AggregationService {
  constructor(private readonly prisma: PrismaReadService) {}

  /**
   * Performs a grouped aggregation on a specified database model.
   *
   * @param model - The Prisma model name to aggregate (e.g., 'user', 'project')
   * @param groupBy - Arrays of fields to group the results by
   * @param metrics - Map of field names to the aggregation operation to apply
   * @param filters - Optional filters to apply before aggregation
   * @returns A promise resolving to an array of aggregated data points
   * @throws Error if the specified model is not found in the Prisma service
   */
  async aggregate(
    model: string,
    groupBy: string[],
    metrics: Record<string, 'count' | 'sum' | 'avg'>,
    filters: any = {},
  ): Promise<any[]> {
    const prismaModel = (this.prisma as any)[model];
    if (!prismaModel) {
      throw new Error(`Model ${model} not found in PrismaReadService`);
    }

    if (groupBy.length === 0) {
      const result: Record<string, Record<string, number>> = {};

      for (const [key, op] of Object.entries(metrics)) {
        if (op === 'count') {
          result._count = {
            ...result._count,
            [key]: await prismaModel.count({ where: filters }),
          };
          continue;
        }

        const aggregateResult = await prismaModel.aggregate({
          where: filters,
          [`_${op}`]: { [key]: true },
        });
        const metricKey = `_${op}`;
        result[metricKey] = {
          ...result[metricKey],
          [key]: aggregateResult[metricKey]?.[key] ?? 0,
        };
      }

      return [result];
    }

    const _metrics: any = {};
    for (const [key, op] of Object.entries(metrics)) {
      _metrics[`_${op}`] = { [key]: true };
    }

    return prismaModel.groupBy({
      by: groupBy,
      where: filters,
      ..._metrics,
    });
  }

  /**
   * Executes a raw SQL query against the read-only database.
   * Use this for highly complex queries that Prisma's API cannot handle efficiently.
   *
   * @param query - The raw SQL query string with placeholders
   * @param params - Parameters to safely bind to the query
   * @returns A promise resolving to the raw query results
   */
  async rawQuery(query: string, params: any[] = []): Promise<any[]> {
    return this.prisma.$queryRawUnsafe(query, ...params);
  }
}
