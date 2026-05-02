/**
 * JSON Search Engine - Evaluator
 *
 * The evaluator executes parsed queries against JSON data.
 * It's the third and final stage of query processing.
 *
 * This module handles:
 * - Expression evaluation (AND, OR, NOT, terms)
 * - Predicate evaluation (comparisons)
 * - Text matching (full-text, fuzzy)
 * - Sorting (ORDER BY)
 *
 * @module engine
 */
import { JsonValue, Expr, Predicate, EvalOptions, OrderBy } from "./types.js";
/**
 * Evaluate an expression against a single data row.
 *
 * @param expr - Parsed expression AST
 * @param item - Data row to evaluate
 * @param options - Evaluation options (case sensitivity, strict mode)
 * @param idx - Row index (for scoring)
 * @returns Whether the row matches
 */
export declare function evalExpr(expr: Expr, item: JsonValue, options: EvalOptions, idx: number): boolean;
/**
 * Evaluate a predicate (field comparison) against a row.
 *
 * Handles all operators:
 * - Comparison: =, !=, >, >=, <, <=
 * - Pattern: LIKE, NOT LIKE
 * - Regex: REGEX, NOT REGEX
 * - Membership: IN, NOT IN
 * - Range: BETWEEN
 * - Text: CONTAINS, STARTS WITH, ENDS WITH, FUZZY
 * - Null: IS NULL, IS NOT NULL, EXISTS
 *
 * @param pred - Parsed predicate
 * @param item - Data row
 * @param options - Evaluation options
 * @param idx - Row index
 * @returns Whether predicate matches
 */
export declare function evalPredicate(pred: Predicate, item: JsonValue, options: EvalOptions, idx: number): boolean;
/**
 * Compare two rows for ORDER BY.
 *
 * @param a - First row
 * @param b - Second row
 * @param orderBy - ORDER BY specifications
 * @param options - Evaluation options
 * @returns -1 if a < b, 1 if a > b, 0 if equal
 */
export declare function compareForSort(a: JsonValue, b: JsonValue, orderBy: OrderBy[], options: EvalOptions): number;
//# sourceMappingURL=engine.d.ts.map