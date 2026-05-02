/**
 * JSON Search Engine - Aggregations
 *
 * Provides aggregation functions: SUM, AVG, MIN, MAX, COUNT, GROUP BY.
 *
 * Supported aggregations:
 * - COUNT(field) or COUNT(*) - Count rows/values
 * - SUM(field) - Sum of values
 * - AVG(field) - Average of values
 * - MIN(field) - Minimum value
 * - MAX(field) - Maximum value
 *
 * GROUP BY groups results by one or more fields.
 *
 * @module aggregates
 */
import { JsonValue, AggSpec } from "./types.js";
/**
 * Aggregate data with optional filtering.
 *
 * @param data - Data rows
 * @param spec - Aggregation specification
 * @returns Aggregation results
 *
 * @example
 * ```typescript
 * // Count all
 * aggregateItems(data, { aggs: [{ op: "COUNT", field: "*" }] });
 *
 * // Sum by group
 * aggregateItems(data, { groupBy: ["country"], aggs: [{ op: "SUM", field: "price" }] });
 * ```
 */
export declare function aggregateItems(data: JsonValue[], spec: AggSpec): JsonValue[];
/**
 * Aggregate specific indices.
 */
export declare function aggregateIndices(data: JsonValue[], indices: number[], spec: AggSpec): JsonValue[];
/**
 * Count rows matching a filter.
 */
export declare function countAll(data: JsonValue[], filter: string): number;
//# sourceMappingURL=aggregates.d.ts.map