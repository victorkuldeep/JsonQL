/**
 * JSON Search Engine - SearchEngine Class
 *
 * Main SearchEngine class that ties everything together.
 *
 * Features:
 * - Field indexing for fast lookups
 * - Result caching with adaptive thresholds
 * - Metrics tracking
 * - Pagination support
 * - Aggregations
 *
 * @module engine-class
 */
import { JsonValue, Query, PagedResult, EngineOptions, EngineDataSize, CacheStats, EngineMetricsSnapshot, IndexStats, ValidationResult, AggSpec, SearchResult } from "./types.js";
/**
 * Main SearchEngine class.
 *
 * Provides high-level API for searching JSON data.
 * Handles caching, indexing, and metrics internally.
 *
 * @example
 * ```typescript
 * const engine = new SearchEngine(data);
 *
 * // Simple search
 * const results = engine.search('country = "USA"');
 *
 * // Paged search
 * const paged = engine.searchPaged('category = "software" LIMIT 10 OFFSET 20');
 *
 * // Aggregations
 * const stats = engine.aggregate({ groupBy: ['country'], aggs: [{ op: 'COUNT', field: '*' }] });
 * ```
 */
export declare class SearchEngine {
    /** Unique engine ID */
    readonly id: number;
    /** Data rows */
    private data;
    /** Field indexes */
    private indexes;
    /** Indexed field names */
    private indexFields;
    /** Result cache */
    private resultCache;
    /** Performance metrics */
    private metrics;
    /** Approximate memory usage */
    private approxBytes;
    /**
     * Create a new SearchEngine.
     *
     * @param data - Array of JSON objects to search
     * @param options - Engine configuration
     */
    constructor(data: JsonValue[], options?: EngineOptions);
    /**
     * Set or update data.
     * Rebuilds indexes and clears cache.
     */
    setData(data: JsonValue[], options?: EngineOptions): void;
    /**
     * Execute a search query.
     *
     * @param query - Query string
     * @returns SearchResult with matching rows
     */
    search(query: string): SearchResult;
    /**
     * Execute a paged search.
     *
     * @param query - Query string with LIMIT/OFFSET
     * @returns PagedResult with rows and total count
     */
    searchPaged(query: string): PagedResult;
    /**
     * Execute search and return row indices.
     * Applies sorting if ORDER BY specified.
     */
    executeSearchIndices(query: Query, options: {
        caseSensitive: boolean;
        strict: boolean;
    }): number[];
    /**
     * Run aggregations on data.
     *
     * @param spec - Aggregation specification
     * @returns Aggregation results
     */
    aggregate(spec: AggSpec): JsonValue[];
    /**
     * Validate a query string.
     *
     * @param query - Query string
     * @returns Validation result
     */
    validate(query: string): ValidationResult;
    /**
     * Get result cache statistics.
     */
    getCacheStats(): CacheStats;
    /**
     * Get performance metrics.
     */
    getMetrics(): EngineMetricsSnapshot;
    /**
     * Get data size information.
     */
    getDataSize(): EngineDataSize;
    /**
     * Get index statistics.
     */
    getIndexes(): IndexStats[];
    /**
     * Create index for a field.
     */
    createIndex(field: string): void;
    /**
     * Drop index for a field.
     */
    dropIndex(field: string): void;
    /**
     * Update engine data.
     */
    update(data: JsonValue[]): void;
    /**
     * Static: Search data without creating engine.
     */
    static searchJson(items: JsonValue[], query: string): JsonValue[];
    /**
     * Static: Paged search without creating engine.
     */
    static searchJsonPaged(items: JsonValue[], query: string): PagedResult;
    /**
     * Static: Validate query without engine.
     */
    static validate(query: string): ValidationResult;
}
/**
 * Create a new SearchEngine.
 *
 * @param json - JSON data or string
 * @param options - Engine options
 * @returns Configured SearchEngine
 */
export declare function initEngine(json: JsonValue[] | string, options?: EngineOptions): SearchEngine;
/**
 * Quick search function.
 * Creates temporary engine.
 */
export declare function searchJson(items: JsonValue[], query: string): JsonValue[];
/**
 * Quick paged search function.
 */
export declare function searchJsonPaged(items: JsonValue[], query: string): PagedResult;
/**
 * Quick validation function.
 */
export declare function validate(query: string): ValidationResult;
/**
 * Set global query cache size.
 */
export declare function setCacheSize(cap: number): void;
//# sourceMappingURL=engine-class.d.ts.map