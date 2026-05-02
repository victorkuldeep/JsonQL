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
import { JsonValue, IndexStats } from "./types.js";
/** Inverted index: maps normalized value to row indices */
export type Index = Map<string, number[]>;
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
export declare class FieldIndex {
    /** Inverted index: value key → row indices */
    private index;
    /** Whether index is case-sensitive */
    private caseSensitive;
    /**
     * Build index from data array.
     * Iterates all rows and indexes the specified field.
     */
    build(data: JsonValue[], field: string, caseSensitive?: boolean): void;
    /**
     * Add a value to index.
     * Handles arrays by adding each element.
     */
    private addValue;
    /**
     * Add a single (non-array) value to index.
     */
    private addSingleValue;
    /**
     * Create normalized index key from value.
     * Includes type prefix to avoid collisions.
     */
    private makeKey;
    /**
     * Get row indices for a value.
     * Fast O(1) lookup instead of O(n) scan.
     */
    get(value: JsonValue): number[];
    /** Get all unique keys in index */
    keys(): string[];
    /** Get index statistics */
    stats(): {
        field: string;
        keys: number;
        entries: number;
    };
}
/**
 * Collection of field indexes.
 * Manages multiple indexes and provides combined queries.
 */
export declare class IndexSet {
    /** Map of field name → field index */
    private indexes;
    /**
     * Build indexes for multiple fields.
     */
    buildAll(data: JsonValue[], fields: string[]): void;
    /** Get index for a field */
    get(field: string): FieldIndex | undefined;
    /** Check if field is indexed */
    has(field: string): boolean;
    /** Get all indexed fields */
    fields(): string[];
    /** List all index statistics */
    list(): IndexStats[];
    /**
     * Create index for a field.
     */
    create(field: string, data: JsonValue[]): void;
    /** Drop index for a field */
    drop(field: string): void;
}
/**
 * Extract potential index filters from expression.
 * Finds predicates that can use indexes (= or IN).
 */
export declare function collectIndexFilters(expr: unknown): {
    field: string;
    values: unknown[];
}[];
/**
 * Use indexes to find matching rows.
 * Intersects results from multiple index lookups.
 *
 * @returns Row indices that match all filters, or null if not optimizable
 */
export declare function useIndexes(indexes: IndexSet, filters: {
    field: string;
    values: unknown[];
}[]): number[] | null;
//# sourceMappingURL=indexes.d.ts.map