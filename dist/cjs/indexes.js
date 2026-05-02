"use strict";
/**
 * JSON Search Engine - Field Indexing
 *
 * Field indexing provides fast lookups for exact value queries.
 * Uses inverted indexes - maps values to row indices.
 *
 * How it works:
 * 1. Index stores: Map<ValueKey → RowIndices[]>
 * 2. When querying with = or IN, we lookup the index
 * 3. Instead of scanning all rows, we use index directly
 *
 * @module indexes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.IndexSet = exports.FieldIndex = void 0;
exports.collectIndexFilters = collectIndexFilters;
exports.useIndexes = useIndexes;
const utils_js_1 = require("./utils.js");
/**
 * Single field index.
 * Creates an inverted index for fast exact lookups.
 *
 * @example
 * ```typescript
 * const idx = new FieldIndex();
 * idx.build(data, "country");
 *
 * // Fast lookup for country = "USA"
 * const usaRows = idx.get("USA");
 * ```
 */
class FieldIndex {
    /** Inverted index: value key → row indices */
    index = new Map();
    /** Whether index is case-sensitive */
    caseSensitive = false;
    /**
     * Build index from data array.
     * Iterates all rows and indexes the specified field.
     */
    build(data, field, caseSensitive = false) {
        this.index = new Map();
        this.caseSensitive = caseSensitive;
        for (let i = 0; i < data.length; i++) {
            const value = (0, utils_js_1.getPath)(data[i], field);
            if (value === undefined)
                continue;
            this.addValue(value, i);
        }
    }
    /**
     * Add a value to index.
     * Handles arrays by adding each element.
     */
    addValue(value, idx) {
        if (Array.isArray(value)) {
            for (const v of value) {
                this.addSingleValue(v, idx);
            }
        }
        else {
            this.addSingleValue(value, idx);
        }
    }
    /**
     * Add a single (non-array) value to index.
     */
    addSingleValue(value, idx) {
        const key = this.makeKey(value);
        if (!key)
            return;
        let list = this.index.get(key);
        if (!list) {
            list = [];
            this.index.set(key, list);
        }
        list.push(idx);
    }
    /**
     * Create normalized index key from value.
     * Includes type prefix to avoid collisions.
     */
    makeKey(value) {
        const normalized = (0, utils_js_1.normalizeValue)(value, this.caseSensitive);
        if (typeof value === "string") {
            return `s:${normalized}`;
        }
        if (typeof value === "number") {
            return `n:${value}`;
        }
        if (typeof value === "boolean") {
            return `b:${value}`;
        }
        if (value === null) {
            return "null";
        }
        return null;
    }
    /**
     * Get row indices for a value.
     * Fast O(1) lookup instead of O(n) scan.
     */
    get(value) {
        const key = this.makeKey(value);
        if (!key)
            return [];
        return this.index.get(key) || [];
    }
    /** Get all unique keys in index */
    keys() {
        return Array.from(this.index.keys());
    }
    /** Get index statistics */
    stats() {
        let entries = 0;
        for (const list of this.index.values()) {
            entries += list.length;
        }
        return {
            field: "",
            keys: this.index.size,
            entries,
        };
    }
}
exports.FieldIndex = FieldIndex;
/**
 * Collection of field indexes.
 * Manages multiple indexes and provides combined queries.
 */
class IndexSet {
    /** Map of field name → field index */
    indexes = new Map();
    /**
     * Build indexes for multiple fields.
     */
    buildAll(data, fields) {
        for (const field of fields) {
            const idx = new FieldIndex();
            idx.build(data, field);
            this.indexes.set(field, idx);
        }
    }
    /** Get index for a field */
    get(field) {
        return this.indexes.get(field);
    }
    /** Check if field is indexed */
    has(field) {
        return this.indexes.has(field);
    }
    /** Get all indexed fields */
    fields() {
        return Array.from(this.indexes.keys());
    }
    /** List all index statistics */
    list() {
        const stats = [];
        for (const [field, idx] of this.indexes) {
            let entries = 0;
            for (const list of idx["index"].values()) {
                entries += list.length;
            }
            stats.push({
                field,
                keys: idx["index"].size,
                entries,
            });
        }
        return stats;
    }
    /**
     * Create index for a field.
     */
    create(field, data) {
        const idx = new FieldIndex();
        idx.build(data, field);
        this.indexes.set(field, idx);
    }
    /** Drop index for a field */
    drop(field) {
        this.indexes.delete(field);
    }
}
exports.IndexSet = IndexSet;
// ============================================================================
// Index-Based Query Optimization
// ============================================================================
/**
 * Extract potential index filters from expression.
 * Finds predicates that can use indexes (= or IN).
 */
function collectIndexFilters(expr) {
    const filters = [];
    function walk(e) {
        if (!e)
            return;
        const expr = e;
        if (expr.type === "And" && expr.parts) {
            // AND: walk all parts
            for (const p of expr.parts)
                walk(p);
        }
        else if (expr.type === "Predicate" && expr.pred) {
            const pred = expr.pred;
            // Only use = and IN operators
            if (pred.op === "Eq" || pred.op === "In") {
                filters.push({ field: pred.field, values: pred.values });
            }
        }
    }
    walk(expr);
    return filters;
}
/**
 * Use indexes to find matching rows.
 * Intersects results from multiple index lookups.
 *
 * @returns Row indices that match all filters, or null if not optimizable
 */
function useIndexes(indexes, filters) {
    if (filters.length === 0)
        return null;
    const sets = [];
    for (const filter of filters) {
        const idx = indexes.get(filter.field);
        if (!idx)
            return null;
        // Collect all row indices from filter values
        const list = [];
        for (const v of filter.values) {
            const matches = idx.get(v);
            if (matches)
                list.push(...matches);
        }
        if (list.length > 0) {
            // Sort and deduplicate
            list.sort((a, b) => a - b);
            const deduped = [];
            let prev = -1;
            for (const x of list) {
                if (x !== prev) {
                    deduped.push(x);
                    prev = x;
                }
            }
            sets.push(deduped);
        }
    }
    if (sets.length === 0)
        return null;
    // Intersect sets (smallest first for efficiency)
    sets.sort((a, b) => a.length - b.length);
    let result = sets[0];
    for (let i = 1; i < sets.length; i++) {
        const next = [];
        let j = 0;
        let k = 0;
        // Merge intersection
        while (j < result.length && k < sets[i].length) {
            if (result[j] === sets[i][k]) {
                next.push(result[j]);
                j++;
                k++;
            }
            else if (result[j] < sets[i][k]) {
                j++;
            }
            else {
                k++;
            }
        }
        result = next;
        if (result.length === 0)
            return null;
    }
    return result;
}
//# sourceMappingURL=indexes.js.map