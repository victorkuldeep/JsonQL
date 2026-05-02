/**
 * JSON Search Engine - Utility Functions
 *
 * Common utility functions used throughout the engine.
 * Includes path navigation, cloning, type checking, and normalization.
 *
 * @module utils
 */
import { JsonValue } from "./types.js";
/**
 * Get a value from a nested object using dotted path.
 *
 * Supports:
 * - Object properties: "name" → obj.name
 * - Nested properties: "meta.region" → obj.meta.region
 * - Array indices: "items[0]" → obj.items[0]
 * - Mixed: "items[0].name" → obj.items[0].name
 *
 * @param value - Object to navigate
 * @param path - Dotted path (e.g., "meta.region")
 * @returns The value at path, or undefined if not found
 *
 * @example
 * ```typescript
 * const obj = { meta: { region: "APAC" } };
 * getPath(obj, "meta.region"); // "APAC"
 * ```
 */
export declare function getPath(value: JsonValue, path: string): JsonValue | undefined;
/**
 * Set a value in a nested object, creating intermediate objects as needed.
 *
 * @param obj - Root object to modify
 * @param path - Dotted path
 * @param value - Value to set
 */
export declare function setPath(obj: Record<string, JsonValue>, path: string, value: JsonValue): void;
/**
 * Deep clone a JSON value using JSON round-trip.
 *
 * @param value - Value to clone
 * @returns Deep copy of the value
 */
export declare function cloneJson(value: JsonValue): JsonValue;
/**
 * Type guard: check if value is a plain object (not array, not null).
 */
export declare function isObject(value: JsonValue): value is Record<string, JsonValue>;
/**
 * Type guard: check if value is an array.
 */
export declare function isArray(value: JsonValue): value is JsonValue[];
/**
 * Normalize a value for comparison/indexing.
 * Returns a string representation that preserves type information.
 */
export declare function normalizeValue(value: JsonValue, caseSensitive: boolean): string;
/**
 * Normalize a string for comparison.
 */
export declare function normalizeString(s: string, caseSensitive: boolean): string;
/**
 * Create a normalized string key for indexing.
 */
export declare function stringifyKey(value: JsonValue, caseSensitive: boolean): string;
//# sourceMappingURL=utils.d.ts.map