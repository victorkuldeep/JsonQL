"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchEngine = void 0;
exports.initEngine = initEngine;
exports.searchJson = searchJson;
exports.searchJsonPaged = searchJsonPaged;
exports.validate = validate;
exports.setCacheSize = setCacheSize;
const parser_js_1 = require("./parser.js");
const engine_js_1 = require("./engine.js");
const indexes_js_1 = require("./indexes.js");
const cache_js_1 = require("./cache.js");
const aggregates_js_1 = require("./aggregates.js");
/** Default fields to index */
const DEFAULT_INDEX_FIELDS = ["category", "country", "active"];
/** Default result cache capacity */
const DEFAULT_RESULT_CACHE_CAP = 128;
/** Minimum hits before caching result */
const DEFAULT_RESULT_CACHE_MIN_HITS = 2;
/** Maximum rows to process */
const MAX_RESULT_ROWS = 1_000_000;
/** Next engine ID */
let nextEngineId = 1;
/** Registry of active engines */
const engines = new Map();
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
class SearchEngine {
    /** Unique engine ID */
    id;
    /** Data rows */
    data = [];
    /** Field indexes */
    indexes = new indexes_js_1.IndexSet();
    /** Indexed field names */
    indexFields = [];
    /** Result cache */
    resultCache = new cache_js_1.ResultCache(DEFAULT_RESULT_CACHE_CAP, DEFAULT_RESULT_CACHE_MIN_HITS);
    /** Performance metrics */
    metrics = new cache_js_1.EngineMetrics();
    /** Approximate memory usage */
    approxBytes = 0;
    /**
     * Create a new SearchEngine.
     *
     * @param data - Array of JSON objects to search
     * @param options - Engine configuration
     */
    constructor(data, options = {}) {
        this.id = nextEngineId++;
        this.setData(data, options);
    }
    /**
     * Set or update data.
     * Rebuilds indexes and clears cache.
     */
    setData(data, options = {}) {
        this.data = data;
        if (options.queryCacheCap) {
            (0, cache_js_1.setQueryCacheSize)(options.queryCacheCap);
        }
        // Build indexes
        const indexFields = options.indexes?.length ? options.indexes : DEFAULT_INDEX_FIELDS;
        this.indexFields = indexFields;
        this.indexes.buildAll(data, indexFields);
        // Calculate memory
        this.approxBytes = JSON.stringify(data).length;
        // Reset cache and metrics
        this.resultCache = new cache_js_1.ResultCache(DEFAULT_RESULT_CACHE_CAP, DEFAULT_RESULT_CACHE_MIN_HITS);
        this.metrics = new cache_js_1.EngineMetrics();
    }
    /**
     * Execute a search query.
     *
     * @param query - Query string
     * @returns SearchResult with matching rows
     */
    search(query) {
        const started = performance.now();
        const parsed = (0, cache_js_1.parseQueryCached)(query);
        const options = {
            caseSensitive: parsed.caseSensitive,
            strict: parsed.strict,
        };
        // Check result cache
        const cached = this.resultCache.get(query);
        let indices;
        if (cached) {
            indices = cached;
            this.metrics.record(0, 0, true);
        }
        else {
            // Execute search
            indices = this.executeSearchIndices(parsed, options);
            this.resultCache.record(query, indices);
            const elapsed = performance.now() - started;
            this.metrics.record(elapsed, indices.length, false);
            // Adaptive caching based on latency
            if (this.metrics.p95Latency() > 50) {
                this.resultCache.setMinHits(1);
            }
            else {
                this.resultCache.setMinHits(DEFAULT_RESULT_CACHE_MIN_HITS);
            }
        }
        // Map indices to rows
        const rows = indices.map(i => this.data[i]);
        return { data: rows, total: indices.length };
    }
    /**
     * Execute a paged search.
     *
     * @param query - Query string with LIMIT/OFFSET
     * @returns PagedResult with rows and total count
     */
    searchPaged(query) {
        const parsed = (0, cache_js_1.parseQueryCached)(query);
        const options = {
            caseSensitive: parsed.caseSensitive,
            strict: parsed.strict,
        };
        // Create cache key without pagination for caching
        let cacheKey = query.toUpperCase().replace(/LIMIT\s+\d+\s*\d*/i, "").trim();
        if (!parsed.orderBy.length) {
            cacheKey = query;
        }
        const cached = this.resultCache.get(cacheKey);
        let indices;
        if (cached) {
            indices = cached;
            this.metrics.record(0, 0, true);
        }
        else {
            indices = this.executeSearchIndices(parsed, options);
            if (cacheKey) {
                this.resultCache.record(cacheKey, indices);
            }
        }
        // Apply pagination
        const offset = parsed.offset ?? 0;
        const limit = parsed.limit ?? MAX_RESULT_ROWS;
        const paged = indices.slice(offset, offset + limit);
        const rows = paged.map(i => this.data[i]);
        return { totalMatches: indices.length, rows };
    }
    /**
     * Execute search and return row indices.
     * Applies sorting if ORDER BY specified.
     */
    executeSearchIndices(query, options) {
        const indices = [];
        for (let i = 0; i < this.data.length; i++) {
            if ((0, engine_js_1.evalExpr)(query.expr, this.data[i], options, i)) {
                indices.push(i);
            }
        }
        // Apply sorting
        if (query.orderBy.length > 0) {
            const hits = indices.map(idx => ({
                idx,
                item: this.data[idx],
            }));
            hits.sort((a, b) => (0, engine_js_1.compareForSort)(a.item, b.item, query.orderBy, options));
            const offset = query.offset ?? 0;
            const limit = query.limit ?? MAX_RESULT_ROWS;
            return hits.slice(offset, offset + limit).map(h => h.idx);
        }
        return indices;
    }
    /**
     * Run aggregations on data.
     *
     * @param spec - Aggregation specification
     * @returns Aggregation results
     */
    aggregate(spec) {
        return (0, aggregates_js_1.aggregateItems)(this.data, spec);
    }
    /**
     * Validate a query string.
     *
     * @param query - Query string
     * @returns Validation result
     */
    validate(query) {
        return (0, parser_js_1.validateQuery)(query);
    }
    /**
     * Get result cache statistics.
     */
    getCacheStats() {
        return this.resultCache.stats();
    }
    /**
     * Get performance metrics.
     */
    getMetrics() {
        return this.metrics.snapshot();
    }
    /**
     * Get data size information.
     */
    getDataSize() {
        return {
            rowCount: this.data.length,
            approxBytes: this.approxBytes,
        };
    }
    /**
     * Get index statistics.
     */
    getIndexes() {
        return this.indexes.list();
    }
    /**
     * Create index for a field.
     */
    createIndex(field) {
        this.indexes.create(field, this.data);
        if (!this.indexFields.includes(field)) {
            this.indexFields.push(field);
        }
    }
    /**
     * Drop index for a field.
     */
    dropIndex(field) {
        this.indexes.drop(field);
        this.indexFields = this.indexFields.filter(f => f !== field);
    }
    /**
     * Update engine data.
     */
    update(data) {
        this.setData(data, { indexes: this.indexFields });
    }
    // ============================================================================
    // Static Methods
    // ============================================================================
    /**
     * Static: Search data without creating engine.
     */
    static searchJson(items, query) {
        const engine = new SearchEngine(items);
        return engine.search(query).data;
    }
    /**
     * Static: Paged search without creating engine.
     */
    static searchJsonPaged(items, query) {
        const engine = new SearchEngine(items);
        return engine.searchPaged(query);
    }
    /**
     * Static: Validate query without engine.
     */
    static validate(query) {
        return (0, parser_js_1.validateQuery)(query);
    }
}
exports.SearchEngine = SearchEngine;
// ============================================================================
// Factory Functions
// ============================================================================
/**
 * Create a new SearchEngine.
 *
 * @param json - JSON data or string
 * @param options - Engine options
 * @returns Configured SearchEngine
 */
function initEngine(json, options = {}) {
    const data = typeof json === "string" ? JSON.parse(json) : json;
    return new SearchEngine(data, options);
}
/**
 * Quick search function.
 * Creates temporary engine.
 */
function searchJson(items, query) {
    return SearchEngine.searchJson(items, query);
}
/**
 * Quick paged search function.
 */
function searchJsonPaged(items, query) {
    return SearchEngine.searchJsonPaged(items, query);
}
/**
 * Quick validation function.
 */
function validate(query) {
    return (0, parser_js_1.validateQuery)(query);
}
/**
 * Set global query cache size.
 */
function setCacheSize(cap) {
    (0, cache_js_1.setQueryCacheSize)(cap);
}
//# sourceMappingURL=engine-class.js.map