/**
 * JSON Search Engine - Caching and Metrics
 *
 * Provides caching for parsed queries and search results.
 * Also tracks performance metrics for optimization.
 *
 * Two-level caching:
 * 1. Query parse cache - parsed Query AST
 * 2. Result cache - matching row indices
 *
 * Metrics tracked:
 * - Query count and latency
 * - Cache hit/miss ratio
 * - p95 latency for adaptive caching
 *
 * @module cache
 */
import { CacheStats, EngineMetricsSnapshot, Query } from "./types.js";
/**
 * Result cache - stores matching row indices.
 *
 * Uses LRU eviction when full.
 * Only caches results after threshold hits for adaptive behavior.
 *
 * @example
 * ```typescript
 * const cache = new ResultCache(128, 2);
 *
 * // Cache hit
 * const rows = cache.get("country = 'USA'");
 *
 * // Record match
 * cache.record("country = 'USA'", [0, 5, 10]);
 * ```
 */
export declare class ResultCache {
    private map;
    private order;
    private cap;
    private minHits;
    private hitsServed;
    private misses;
    constructor(cap?: number, minHits?: number);
    /** Set cache capacity */
    setCap(cap: number): void;
    /** Set minimum hits threshold */
    setMinHits(minHits: number): void;
    /**
     * Get cached result.
     * Returns null if not cached.
     * Updates LRU order on hit.
     */
    get(key: string): number[] | null;
    /**
     * Record a search result.
     * Only caches if hit threshold reached.
     */
    record(key: string, data: number[]): void;
    /** Get cache statistics */
    stats(): CacheStats;
}
/**
 * Engine metrics - tracks performance.
 *
 * Metrics collected:
 * - Total queries run
 * - Average latency
 * - p95 latency (for adaptive caching)
 * - Rows scanned
 * - Cache hit rate
 */
export declare class EngineMetrics {
    private queryCount;
    private totalMs;
    private latencySamples;
    private rowsScanned;
    private cacheHits;
    private cacheMisses;
    /**
     * Record a query execution.
     */
    record(elapsedMs: number, scanned: number, cacheHit: boolean): void;
    /** Average query latency */
    avgLatency(): number;
    /** 95th percentile latency */
    p95Latency(): number;
    /** Get metrics snapshot */
    snapshot(): EngineMetricsSnapshot;
}
/**
 * Set global query cache size.
 */
export declare function setQueryCacheSize(cap: number): void;
/**
 * Parse query with caching.
 * Checks cache first, parses if needed.
 */
export declare function parseQueryCached(query: string): Query;
//# sourceMappingURL=cache.d.ts.map