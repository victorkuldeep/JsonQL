"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parser = void 0;
exports.parseQuery = parseQuery;
exports.validateQuery = validateQuery;
const types_js_1 = require("./types.js");
const lexer_js_1 = require("./lexer.js");
/** Maximum nesting depth for expressions to prevent stack overflow */
const MAX_NESTING_DEPTH = 100;
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
class Parser {
    /** Token stream */
    tokens = [];
    /** Current position in token stream */
    pos = 0;
    /** Current nesting depth for parentheses */
    depth = 0;
    /**
     * Parse tokens into an expression (WHERE clause only).
     * Used internally for sub-expressions.
     */
    parse(tokens) {
        this.tokens = tokens;
        this.pos = 0;
        this.depth = 0;
        return this.parseOr();
    }
    /**
     * Parse full query including SELECT, WHERE, ORDER BY, LIMIT, OFFSET.
     * Main entry point for query parsing.
     *
     * @param input - Normalized query string
     * @returns Complete Query object
     */
    parseFull(input) {
        const normalized = normalizeQuery(input);
        const lexer = new lexer_js_1.Lexer();
        const tokens = lexer.tokenize(normalized);
        this.tokens = tokens;
        this.pos = 0;
        this.depth = 0;
        // Empty query - match all
        if (this.peek().kind === types_js_1.TokenKind.Eof) {
            return {
                expr: { type: "All" },
                projection: null,
                orderBy: [],
                limit: null,
                offset: null,
                caseSensitive: false,
                strict: false,
                scoreNeeded: false,
            };
        }
        let expr;
        let projection = null;
        // Handle SELECT clause
        if (this.peek().kind === types_js_1.TokenKind.Select) {
            this.next();
            projection = this.parseProjectionList();
            if (this.peek().kind === types_js_1.TokenKind.Where) {
                this.next();
                expr = this.parseOr();
            }
            else {
                expr = { type: "All" };
            }
        }
        else if (isQueryModifier(this.peek().kind)) {
            // No WHERE clause, start with "All"
            expr = { type: "All" };
        }
        else {
            // Bare WHERE expression
            expr = this.parseOr();
        }
        // Parse ORDER BY, LIMIT, OFFSET clauses
        const orderBy = [];
        let limit = null;
        let offset = null;
        let caseSensitive = false;
        let strict = false;
        while (this.peek().kind !== types_js_1.TokenKind.Eof) {
            const tok = this.peek();
            switch (tok.kind) {
                case types_js_1.TokenKind.Case:
                    this.next();
                    const cs = this.peek();
                    if (cs.kind === types_js_1.TokenKind.Sensitive) {
                        caseSensitive = true;
                        this.next();
                    }
                    else if (cs.kind === types_js_1.TokenKind.Insensitive) {
                        caseSensitive = false;
                        this.next();
                    }
                    else {
                        throw new types_js_1.QueryParseError("Expected SENSITIVE or INSENSITIVE after CASE", this.peek().pos);
                    }
                    break;
                case types_js_1.TokenKind.Strict:
                    this.next();
                    strict = true;
                    break;
                case types_js_1.TokenKind.Order:
                    this.next();
                    this.expect(types_js_1.TokenKind.By, "Expected BY after ORDER");
                    orderBy.push(this.parseOrderBy());
                    break;
                case types_js_1.TokenKind.Limit:
                    this.next();
                    const ln = this.peek();
                    if (ln.kind !== types_js_1.TokenKind.Number) {
                        throw new types_js_1.QueryParseError("Expected number after LIMIT", this.peek().pos);
                    }
                    limit = ln.value;
                    if (limit < 0) {
                        throw new types_js_1.QueryParseError("LIMIT must be non-negative", this.peek().pos);
                    }
                    this.next();
                    break;
                case types_js_1.TokenKind.Offset:
                    this.next();
                    const os = this.peek();
                    if (os.kind !== types_js_1.TokenKind.Number) {
                        throw new types_js_1.QueryParseError("Expected number after OFFSET", this.peek().pos);
                    }
                    offset = os.value;
                    if (offset < 0) {
                        throw new types_js_1.QueryParseError("OFFSET must be non-negative", this.peek().pos);
                    }
                    this.next();
                    break;
                case types_js_1.TokenKind.Eof:
                    break;
                case types_js_1.TokenKind.Ident:
                case types_js_1.TokenKind.String:
                    // Handle bare full-text terms with AND/OR operators
                    // Need to convert: term AND term OR term → proper expression
                    if (expr && (expr.type === "Term" || expr.type === "FuzzyTerm" || expr.type === "And")) {
                        // Collect trailing identifiers first
                        const terms = [];
                        if (expr.type === "And") {
                            terms.push(...expr.parts);
                        }
                        else if (expr.type === "Term" || expr.type === "FuzzyTerm") {
                            terms.push(expr);
                        }
                        while (this.peek().kind === types_js_1.TokenKind.Ident || this.peek().kind === types_js_1.TokenKind.String) {
                            const tok = this.next();
                            terms.push({ type: "Term", value: tok.value });
                        }
                        // Now we have multiple terms - check if next is AND/OR
                        if (this.peek().kind === types_js_1.TokenKind.And || this.peek().kind === types_js_1.TokenKind.Or) {
                            const op = this.next();
                            // Get right side terms
                            const rightTerms = [];
                            while (this.peek().kind === types_js_1.TokenKind.Ident || this.peek().kind === types_js_1.TokenKind.String) {
                                const tok = this.next();
                                rightTerms.push({ type: "Term", value: tok.value });
                            }
                            if (rightTerms.length === 0) {
                                throw new types_js_1.QueryParseError(`Expected term after AND/OR`, this.peek().pos);
                            }
                            // Build combined expression
                            const leftExpr = terms.length === 1 ? terms[0] : { type: "And", parts: terms };
                            const rightExpr = rightTerms.length === 1 ? rightTerms[0] : { type: "And", parts: rightTerms };
                            if (op.kind === types_js_1.TokenKind.And) {
                                expr = { type: "And", parts: [leftExpr, rightExpr] };
                            }
                            else {
                                expr = { type: "Or", parts: [leftExpr, rightExpr] };
                            }
                        }
                        else {
                            // Just multiple terms without explicit operator - combine as AND
                            expr = terms.length === 1 ? terms[0] : { type: "And", parts: terms };
                        }
                        continue;
                    }
                    throw new types_js_1.QueryParseError("Unexpected trailing input", this.peek().pos);
                default:
                    // Allow trailing tokens for bare terms (full-text search)
                    // Don't throw - just break and return what we parsed
                    if (expr && (expr.type === "Term" || expr.type === "FuzzyTerm" || expr.type === "All")) {
                        // Reset position to end
                        while (this.peek().kind !== types_js_1.TokenKind.Eof) {
                            this.next();
                        }
                        break;
                    }
                    throw new types_js_1.QueryParseError("Unexpected trailing input", this.peek().pos);
            }
        }
        // Compile regex patterns
        compileRegexes(expr);
        const projectionHasScore = projection?.some(f => f.toUpperCase() === "SCORE") ?? false;
        const orderHasScore = orderBy.some(o => o.field.toUpperCase() === "SCORE");
        const scoreNeeded = projectionHasScore || orderHasScore;
        return { expr, projection, orderBy, limit, offset, caseSensitive, strict, scoreNeeded };
    }
    // ============================================================================
    // Token Stream Navigation
    // ============================================================================
    /** Peek at current token without consuming */
    peek() {
        return this.tokens[this.pos];
    }
    /** Consume and return current token */
    next() {
        const tok = this.tokens[this.pos];
        this.pos++;
        return tok;
    }
    /** Expect a specific token kind, throw if not found */
    expect(kind, msg) {
        const tok = this.peek();
        if (tok.kind === kind) {
            this.next();
        }
        else {
            throw new types_js_1.QueryParseError(msg, tok.pos);
        }
    }
    // ============================================================================
    // Expression Parsing - Recursive Descent
    // ============================================================================
    /**
     * Parse OR expression.
     * OR has lowest precedence, parsed first.
     * a OR b OR c → { type: "Or", parts: [a, b, c] }
     */
    parseOr() {
        const parts = [this.parseAnd()];
        while (this.peek().kind === types_js_1.TokenKind.Or) {
            this.next();
            parts.push(this.parseAnd());
        }
        if (parts.length === 1)
            return parts[0];
        return { type: "Or", parts };
    }
    /**
     * Parse AND expression.
     * AND has higher precedence than OR.
     * a AND b AND c → { type: "And", parts: [a, b, c] }
     */
    parseAnd() {
        const parts = [this.parseNot()];
        while (this.peek().kind === types_js_1.TokenKind.And) {
            this.next();
            parts.push(this.parseNot());
        }
        if (parts.length === 1)
            return parts[0];
        return { type: "And", parts };
    }
    /**
     * Parse NOT expression.
     * Unary operator with highest precedence.
     * NOT a → { type: "Not", inner: a }
     */
    parseNot() {
        if (this.peek().kind === types_js_1.TokenKind.Not) {
            this.next();
            this.enterDepth();
            const inner = this.parseNot();
            this.exitDepth();
            return { type: "Not", inner };
        }
        return this.parsePrimary();
    }
    /**
     * Parse primary expression.
     * Handles: parentheses, terms, predicates.
     *
     * (expr) - Grouped expression
     * "text" - Full-text term
     * FUZZY "text" - Fuzzy search term
     * field = value - Predicate
     */
    parsePrimary() {
        const tok = this.peek();
        switch (tok.kind) {
            case types_js_1.TokenKind.LParen:
                this.next();
                this.enterDepth();
                const expr = this.parseOr();
                this.exitDepth();
                this.expect(types_js_1.TokenKind.RParen, "Expected ')'");
                return expr;
            case types_js_1.TokenKind.Eof:
                return { type: "All" };
            case types_js_1.TokenKind.Ident:
                // Could be predicate or full-text term
                if (this.isPredicateStart()) {
                    const pred = this.parsePredicate();
                    return { type: "Predicate", pred };
                }
                return { type: "Term", value: tok.value };
            case types_js_1.TokenKind.Fuzzy:
                this.next();
                return { type: "FuzzyTerm", value: this.parseTerm() };
            case types_js_1.TokenKind.String:
                return { type: "Term", value: tok.value };
            case types_js_1.TokenKind.Number:
                // Bare number with comparison? Try to parse as numeric predicate
                // Look at next token - could be > >= < <= !
                const next = this.tokens[this.pos + 1];
                if (next && (next.kind === types_js_1.TokenKind.Gt || next.kind === types_js_1.TokenKind.Gte ||
                    next.kind === types_js_1.TokenKind.Lt || next.kind === types_js_1.TokenKind.Lte ||
                    next.kind === types_js_1.TokenKind.Neq)) {
                    // This is a numeric comparison query - apply to all fields
                    return { type: "Term", value: String(tok.value) };
                }
                return { type: "Term", value: String(tok.value) };
            case types_js_1.TokenKind.Gt:
            case types_js_1.TokenKind.Gte:
            case types_js_1.TokenKind.Lt:
            case types_js_1.TokenKind.Lte:
                // Bare comparison operator at start -> numeric comparison across all fields
                // Create a special expression that checks ALL numeric fields
                const optok = this.next();
                const numVal = this.peek();
                if (numVal.kind === types_js_1.TokenKind.Number) {
                    const num = numVal.value;
                    this.next();
                    // Return a special term that evaluator will treat as numeric comparison
                    // Format: >N for >, <N for <, etc.
                    const opChar = optok.kind === types_js_1.TokenKind.Gt ? ">" :
                        optok.kind === types_js_1.TokenKind.Gte ? ">=" :
                            optok.kind === types_js_1.TokenKind.Lt ? "<" : "<=";
                    return { type: "NumericTerm", value: String(num), op: opChar };
                }
                throw new types_js_1.QueryParseError("Expected number after comparison operator", this.peek().pos);
            case types_js_1.TokenKind.Neq:
                // Could be prefix NOT or !=
                this.next();
                const notVal = this.peek();
                if (notVal.kind === types_js_1.TokenKind.Number) {
                    const term = { type: "Term", value: String(notVal.value) };
                    this.next();
                    return term;
                }
                throw new types_js_1.QueryParseError("Expected value after !", this.peek().pos);
            default:
                throw new types_js_1.QueryParseError("Expected term, predicate, or '('", tok.pos);
        }
    }
    // ============================================================================
    // Predicate Parsing
    // ============================================================================
    /**
     * Check if current position starts a predicate.
     * Looks for: field operator value pattern.
     */
    isPredicateStart() {
        const tok = this.peek();
        if (tok.kind !== types_js_1.TokenKind.Ident)
            return false;
        const next = this.tokens[this.pos + 1];
        if (!next)
            return false;
        return isPredicateOp(next.kind);
    }
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
    parsePredicate() {
        const tok = this.next();
        const field = tok.value;
        if (!(0, lexer_js_1.isValidFieldName)(field)) {
            throw new types_js_1.QueryParseError("Invalid field name", tok.pos);
        }
        let pred;
        const opTok = this.peek();
        const op = parseOperator(opTok.kind);
        this.next();
        switch (op) {
            case types_js_1.Op.In:
                pred = { field, op, values: this.parseList() };
                break;
            case types_js_1.Op.Like:
            case types_js_1.Op.Contains:
            case types_js_1.Op.Fuzzy:
            case types_js_1.Op.StartsWith:
            case types_js_1.Op.EndsWith:
                // STARTS WITH and ENDS WITH need "WITH" keyword
                if (op === types_js_1.Op.StartsWith) {
                    this.expect(types_js_1.TokenKind.With, "Expected WITH after STARTS");
                }
                else if (op === types_js_1.Op.EndsWith) {
                    this.expect(types_js_1.TokenKind.With, "Expected WITH after ENDS");
                }
                pred = { field, op, values: [this.parseValue()] };
                break;
            case types_js_1.Op.Between:
                pred = { field, op, values: this.parseBetween() };
                break;
            case types_js_1.Op.Exists:
                pred = { field, op, values: [] };
                break;
            case types_js_1.Op.IsNull:
            case types_js_1.Op.IsNotNull:
                pred = { field, op, values: [] };
                break;
            case types_js_1.Op.Regex:
            case types_js_1.Op.NotRegex: {
                const lit = this.parseValue();
                if (lit.type !== "Str") {
                    throw new types_js_1.QueryParseError("REGEX expects a string literal", this.peek().pos);
                }
                (0, lexer_js_1.validateRegexPattern)(lit.value, this.peek().pos);
                pred = { field, op, values: [{ type: "Regex", value: lit.value }] };
                break;
            }
            default:
                pred = { field, op, values: [this.parseValueFieldable()] };
        }
        return pred;
    }
    /**
     * Parse a search term (full-text or fuzzy).
     */
    parseTerm() {
        const tok = this.next();
        if (tok.kind === types_js_1.TokenKind.Ident || tok.kind === types_js_1.TokenKind.String) {
            return tok.value;
        }
        throw new types_js_1.QueryParseError("Expected term", tok.pos);
    }
    /**
     * Parse a literal value.
     */
    parseValue() {
        const tok = this.next();
        switch (tok.kind) {
            case types_js_1.TokenKind.String:
                return { type: "Str", value: tok.value };
            case types_js_1.TokenKind.Ident:
                return { type: "Str", value: tok.value };
            case types_js_1.TokenKind.Number:
                return { type: "Num", value: tok.value };
            case types_js_1.TokenKind.Bool:
                return { type: "Bool", value: tok.value };
            case types_js_1.TokenKind.Null:
                return { type: "Null" };
            default:
                throw new types_js_1.QueryParseError("Expected value", tok.pos);
        }
    }
    /**
     * Parse a value that can also be a field reference.
     */
    parseValueFieldable() {
        const tok = this.next();
        switch (tok.kind) {
            case types_js_1.TokenKind.String:
                return { type: "Str", value: tok.value };
            case types_js_1.TokenKind.Ident:
                return { type: "Field", value: tok.value };
            case types_js_1.TokenKind.Number:
                return { type: "Num", value: tok.value };
            case types_js_1.TokenKind.Bool:
                return { type: "Bool", value: tok.value };
            case types_js_1.TokenKind.Null:
                return { type: "Null" };
            default:
                throw new types_js_1.QueryParseError("Expected value", tok.pos);
        }
    }
    /**
     * Parse comma-separated list in parentheses.
     * Used for IN clause.
     */
    parseList() {
        this.expect(types_js_1.TokenKind.LParen, "Expected '(' after IN");
        const values = [];
        if (this.peek().kind === types_js_1.TokenKind.RParen) {
            this.next();
            return values;
        }
        while (true) {
            values.push(this.parseValue());
            if (this.peek().kind === types_js_1.TokenKind.Comma) {
                this.next();
                continue;
            }
            if (this.peek().kind === types_js_1.TokenKind.RParen) {
                this.next();
                break;
            }
            throw new types_js_1.QueryParseError("Expected ',' or ')'", this.peek().pos);
        }
        return values;
    }
    /**
     * Parse BETWEEN clause.
     * Supports both: BETWEEN (a, b) and BETWEEN a AND b
     */
    parseBetween() {
        if (this.peek().kind === types_js_1.TokenKind.LParen) {
            this.next();
            const first = this.parseValueFieldable();
            this.expect(types_js_1.TokenKind.Comma, "Expected ',' in BETWEEN");
            const second = this.parseValueFieldable();
            this.expect(types_js_1.TokenKind.RParen, "Expected ')' after BETWEEN");
            return [first, second];
        }
        const first = this.parseValueFieldable();
        this.expect(types_js_1.TokenKind.And, "Expected AND in BETWEEN");
        const second = this.parseValueFieldable();
        return [first, second];
    }
    /**
     * Parse SELECT field list.
     */
    parseProjectionList() {
        const fields = [];
        while (true) {
            const tok = this.peek();
            if (tok.kind === types_js_1.TokenKind.Ident) {
                fields.push(tok.value);
                this.next();
            }
            else if (tok.kind === types_js_1.TokenKind.Score) {
                fields.push("SCORE");
                this.next();
            }
            else {
                throw new types_js_1.QueryParseError("Expected field in SELECT", tok.pos);
            }
            if (this.peek().kind === types_js_1.TokenKind.Comma) {
                this.next();
                continue;
            }
            break;
        }
        return fields;
    }
    /**
     * Parse ORDER BY clause.
     */
    parseOrderBy() {
        const tok = this.peek();
        let field;
        if (tok.kind === types_js_1.TokenKind.Ident) {
            field = tok.value;
            this.next();
        }
        else if (tok.kind === types_js_1.TokenKind.Score) {
            field = "SCORE";
            this.next();
        }
        else {
            throw new types_js_1.QueryParseError("Expected field after ORDER BY", tok.pos);
        }
        let desc = false;
        if (this.peek().kind === types_js_1.TokenKind.Desc) {
            desc = true;
            this.next();
        }
        else if (this.peek().kind === types_js_1.TokenKind.Asc) {
            this.next();
        }
        let nullsFirst = null;
        if (this.peek().kind === types_js_1.TokenKind.Nulls) {
            this.next();
            const nf = this.peek();
            if (nf.kind === types_js_1.TokenKind.First) {
                nullsFirst = true;
                this.next();
            }
            else if (nf.kind === types_js_1.TokenKind.Last) {
                nullsFirst = false;
                this.next();
            }
            else {
                throw new types_js_1.QueryParseError("Expected FIRST or LAST after NULLS", this.peek().pos);
            }
        }
        return { field, desc, nullsFirst };
    }
    // ============================================================================
    // Depth Tracking
    // ============================================================================
    /** Track nesting depth for parentheses */
    enterDepth() {
        this.depth++;
        if (this.depth > MAX_NESTING_DEPTH) {
            throw new types_js_1.QueryParseError(`Max nesting depth exceeded (${MAX_NESTING_DEPTH})`, this.peek().pos);
        }
    }
    exitDepth() {
        if (this.depth > 0)
            this.depth--;
    }
}
exports.Parser = Parser;
// ============================================================================
// Helper Functions
// ============================================================================
/**
 * Check if token kind starts a predicate.
 */
function isPredicateOp(kind) {
    return (kind === types_js_1.TokenKind.In ||
        kind === types_js_1.TokenKind.Like ||
        kind === types_js_1.TokenKind.Regex ||
        kind === types_js_1.TokenKind.Fuzzy ||
        kind === types_js_1.TokenKind.Not ||
        kind === types_js_1.TokenKind.Between ||
        kind === types_js_1.TokenKind.Contains ||
        kind === types_js_1.TokenKind.Starts ||
        kind === types_js_1.TokenKind.Ends ||
        kind === types_js_1.TokenKind.Exists ||
        kind === types_js_1.TokenKind.Is ||
        kind === types_js_1.TokenKind.Eq ||
        kind === types_js_1.TokenKind.Neq ||
        kind === types_js_1.TokenKind.Gt ||
        kind === types_js_1.TokenKind.Gte ||
        kind === types_js_1.TokenKind.Lt ||
        kind === types_js_1.TokenKind.Lte);
}
/**
 * Check if token kind is a query modifier (ORDER, LIMIT, etc.)
 */
function isQueryModifier(kind) {
    return (kind === types_js_1.TokenKind.Order ||
        kind === types_js_1.TokenKind.Limit ||
        kind === types_js_1.TokenKind.Offset ||
        kind === types_js_1.TokenKind.Case ||
        kind === types_js_1.TokenKind.Strict ||
        kind === types_js_1.TokenKind.Eof);
}
/**
 * Convert TokenKind to Op enum.
 */
function parseOperator(kind) {
    switch (kind) {
        case types_js_1.TokenKind.In: return types_js_1.Op.In;
        case types_js_1.TokenKind.Like: return types_js_1.Op.Like;
        case types_js_1.TokenKind.Regex: return types_js_1.Op.Regex;
        case types_js_1.TokenKind.Fuzzy: return types_js_1.Op.Fuzzy;
        case types_js_1.TokenKind.Between: return types_js_1.Op.Between;
        case types_js_1.TokenKind.Contains: return types_js_1.Op.Contains;
        case types_js_1.TokenKind.Starts: return types_js_1.Op.StartsWith;
        case types_js_1.TokenKind.Ends: return types_js_1.Op.EndsWith;
        case types_js_1.TokenKind.Exists: return types_js_1.Op.Exists;
        case types_js_1.TokenKind.Is: return types_js_1.Op.IsNull;
        case types_js_1.TokenKind.Eq: return types_js_1.Op.Eq;
        case types_js_1.TokenKind.Neq: return types_js_1.Op.Neq;
        case types_js_1.TokenKind.Gt: return types_js_1.Op.Gt;
        case types_js_1.TokenKind.Gte: return types_js_1.Op.Gte;
        case types_js_1.TokenKind.Lt: return types_js_1.Op.Lt;
        case types_js_1.TokenKind.Lte: return types_js_1.Op.Lte;
        default:
            throw new types_js_1.QueryParseError("Expected operator", 0);
    }
}
/**
 * Normalize query string.
 * Collapses multiple whitespace into single space.
 * Preserves spaces inside quoted strings.
 */
function normalizeQuery(query) {
    let out = "";
    let lastSpace = false;
    let inQuote = null;
    for (const ch of query) {
        if (inQuote) {
            out += ch;
            if (ch === inQuote)
                inQuote = null;
            continue;
        }
        if (ch === '"' || ch === "'") {
            inQuote = ch;
            out += ch;
            lastSpace = false;
            continue;
        }
        if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
            if (!lastSpace) {
                out += " ";
                lastSpace = true;
            }
        }
        else {
            out += ch;
            lastSpace = false;
        }
    }
    return out.trim();
}
/**
 * Compile regex string patterns to RegExp objects.
 * Called after parsing, before evaluation.
 */
function compileRegexes(expr) {
    if (expr.type === "Or" || expr.type === "And") {
        for (const p of expr.parts)
            compileRegexes(p);
    }
    else if (expr.type === "Not") {
        compileRegexes(expr.inner);
    }
    else if (expr.type === "Predicate") {
        const pred = expr.pred;
        if (pred.op === types_js_1.Op.Regex || pred.op === types_js_1.Op.NotRegex) {
            if (pred.values[0]?.type === "Regex") {
                try {
                    pred.values[0] = { type: "RegexCompiled", value: new RegExp(pred.values[0].value) };
                }
                catch {
                    throw new types_js_1.QueryParseError("Invalid REGEX pattern", 0);
                }
            }
        }
    }
}
// ============================================================================
// Public API
// ============================================================================
/**
 * Parse a query string into a Query object.
 * Main entry point for query parsing.
 *
 * @param query - Query string
 * @returns Parsed Query AST
 * @throws QueryParseError if query is invalid
 */
function parseQuery(query) {
    const parser = new Parser();
    const normalized = normalizeQuery(query);
    return parser.parseFull(normalized);
}
/**
 * Validate a query string without fully parsing.
 *
 * @param query - Query string
 * @returns Validation result with normalized query or error
 */
function validateQuery(query) {
    const normalized = normalizeQuery(query);
    try {
        parseQuery(normalized);
        return { ok: true, normalized, error: null };
    }
    catch (e) {
        const err = e;
        return { ok: false, normalized: null, error: { message: err.message, pos: 0 } };
    }
}
//# sourceMappingURL=parser.js.map