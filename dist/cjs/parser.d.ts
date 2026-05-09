/**
 * JSON Search Engine - Parser
 *
 * The parser converts token stream into a Query AST (Abstract Syntax Tree).
 * It's the second stage of query processing.
 *
 * Grammar supported:
 * - SELECT field1, field2 - Field projection
 * - WHERE expr - Boolean search expression
 * - ORDER BY field [ASC|DESC] [NULLS FIRST|LAST] - Sorting
 * - LIMIT n - Result limit
 * - OFFSET n - Result offset
 * - CASE SENSITIVE/INSENSITIVE - String comparison mode
 * - STRICT - Type strict mode
 *
 * Boolean operators: AND, OR, NOT
 * Comparison operators: =, !=, >, >=, <, <=, LIKE, IN, BETWEEN, CONTAINS, etc.
 *
 * @module parser
 */
import { Token, Expr, Query, ValidationResult } from "./types.js";
/**
 * Parser class for building Query AST from tokens.
 *
 * Recursive descent parser supporting the full query grammar.
 * Parses in order: OR → AND → NOT → Primary → Predicate
 *
 * @example
 * ```typescript
 * const parser = new Parser();
 * const query = parser.parseFull('country = "USA" AND age > 25 ORDER BY name');
 * // Returns:
 * // {
 * //   expr: { type: "And", parts: [...] },
 * //   projection: null,
 * //   orderBy: [{ field: "name", desc: false, nullsFirst: null }],
 * //   ...
 * // }
 * ```
 */
export declare class Parser {
    /** Token stream */
    private tokens;
    /** Current position in token stream */
    private pos;
    /** Current nesting depth for parentheses */
    private depth;
    /**
     * Parse tokens into an expression (WHERE clause only).
     * Used internally for sub-expressions.
     */
    parse(tokens: Token[]): Expr;
    /**
     * Parse full query including SELECT, WHERE, ORDER BY, LIMIT, OFFSET.
     * Main entry point for query parsing.
     *
     * @param input - Normalized query string
     * @returns Complete Query object
     */
    parseFull(input: string): Query;
    /** Peek at current token without consuming */
    private peek;
    /** Consume and return current token */
    private next;
    /** Expect a specific token kind, throw if not found */
    private expect;
    /**
     * Parse OR expression.
     * OR has lowest precedence, parsed first.
     * a OR b OR c → { type: "Or", parts: [a, b, c] }
     */
    private parseOr;
    /**
     * Parse AND expression.
     * AND has higher precedence than OR.
     * a AND b AND c → { type: "And", parts: [a, b, c] }
     */
    private parseAnd;
    /**
     * Adjacent full-text operands without the AND keyword (smart-search / implicit AND).
     */
    private isImplicitAndContinuance;
    /**
     * Parse NOT expression.
     * Unary operator with highest precedence.
     * NOT a → { type: "Not", inner: a }
     */
    private parseNot;
    /**
     * Parse primary expression.
     * Handles: parentheses, terms, predicates.
     *
     * (expr) - Grouped expression
     * "text" - Full-text term
     * FUZZY "text" - Fuzzy search term
     * field = value - Predicate
     */
    private parsePrimary;
    /**
     * Check if current position starts a predicate.
     * Looks for: field operator value pattern.
     */
    private isPredicateStart;
    /**
     * Parse a predicate (field comparison).
     *
     * Examples:
     * - country = "USA"
     * - age > 25
     * - name LIKE "%test%"
     * - status IN ("a", "b")
     * - price BETWEEN (100, 200)
     */
    private parsePredicate;
    /**
     * Parse a search term (full-text or fuzzy).
     */
    private parseTerm;
    /**
     * Parse a literal value.
     */
    private parseValue;
    /**
     * Parse a value that can also be a field reference.
     */
    private parseValueFieldable;
    /**
     * Parse comma-separated list in parentheses.
     * Used for IN clause.
     */
    private parseList;
    /**
     * Parse BETWEEN clause.
     * Supports both: BETWEEN (a, b) and BETWEEN a AND b
     */
    private parseBetween;
    /**
     * Parse SELECT field list.
     */
    private parseProjectionList;
    /**
     * Parse ORDER BY clause with support for multiple comma-separated fields.
     */
    private parseOrderByList;
    /**
     * Parse a single sort specification in ORDER BY.
     */
    private parseOrderBy;
    /** Track nesting depth for parentheses */
    private enterDepth;
    private exitDepth;
}
/**
 * Parse a query string into a Query object.
 * Main entry point for query parsing.
 *
 * @param query - Query string
 * @returns Parsed Query AST
 * @throws QueryParseError if query is invalid
 */
export declare function parseQuery(query: string): Query;
/**
 * Validate a query string without fully parsing.
 *
 * @param query - Query string
 * @returns Validation result with normalized query or error
 */
export declare function validateQuery(query: string): ValidationResult;
//# sourceMappingURL=parser.d.ts.map