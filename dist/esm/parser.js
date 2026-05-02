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
import { TokenKind, Op, QueryParseError } from "./types.js";
import { Lexer, isValidFieldName, validateRegexPattern } from "./lexer.js";
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
export class Parser {
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
        const lexer = new Lexer();
        const tokens = lexer.tokenize(normalized);
        this.tokens = tokens;
        this.pos = 0;
        this.depth = 0;
        // Empty query - match all
        if (this.peek().kind === TokenKind.Eof) {
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
        if (this.peek().kind === TokenKind.Select) {
            this.next();
            projection = this.parseProjectionList();
            if (this.peek().kind === TokenKind.Where) {
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
        while (this.peek().kind !== TokenKind.Eof) {
            const tok = this.peek();
            switch (tok.kind) {
                case TokenKind.Case:
                    this.next();
                    const cs = this.peek();
                    if (cs.kind === TokenKind.Sensitive) {
                        caseSensitive = true;
                        this.next();
                    }
                    else if (cs.kind === TokenKind.Insensitive) {
                        caseSensitive = false;
                        this.next();
                    }
                    else {
                        throw new QueryParseError("Expected SENSITIVE or INSENSITIVE after CASE", this.peek().pos);
                    }
                    break;
                case TokenKind.Strict:
                    this.next();
                    strict = true;
                    break;
                case TokenKind.Order:
                    this.next();
                    this.expect(TokenKind.By, "Expected BY after ORDER");
                    orderBy.push(this.parseOrderBy());
                    break;
                case TokenKind.Limit:
                    this.next();
                    const ln = this.peek();
                    if (ln.kind !== TokenKind.Number) {
                        throw new QueryParseError("Expected number after LIMIT", this.peek().pos);
                    }
                    limit = ln.value;
                    if (limit < 0) {
                        throw new QueryParseError("LIMIT must be non-negative", this.peek().pos);
                    }
                    this.next();
                    break;
                case TokenKind.Offset:
                    this.next();
                    const os = this.peek();
                    if (os.kind !== TokenKind.Number) {
                        throw new QueryParseError("Expected number after OFFSET", this.peek().pos);
                    }
                    offset = os.value;
                    if (offset < 0) {
                        throw new QueryParseError("OFFSET must be non-negative", this.peek().pos);
                    }
                    this.next();
                    break;
                case TokenKind.Eof:
                    break;
                default:
                    // Allow trailing tokens for bare terms (full-text search)
                    // Don't throw - just break and return what we parsed
                    if (expr && (expr.type === "Term" || expr.type === "FuzzyTerm" || expr.type === "All")) {
                        // Reset position to end
                        while (this.peek().kind !== TokenKind.Eof) {
                            this.next();
                        }
                        break;
                    }
                    throw new QueryParseError("Unexpected trailing input", this.peek().pos);
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
            throw new QueryParseError(msg, tok.pos);
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
        while (this.peek().kind === TokenKind.Or) {
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
        while (this.peek().kind === TokenKind.And) {
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
        if (this.peek().kind === TokenKind.Not) {
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
            case TokenKind.LParen:
                this.next();
                this.enterDepth();
                const expr = this.parseOr();
                this.exitDepth();
                this.expect(TokenKind.RParen, "Expected ')'");
                return expr;
            case TokenKind.Eof:
                return { type: "All" };
            case TokenKind.Ident:
                // Could be predicate or full-text term
                if (this.isPredicateStart()) {
                    const pred = this.parsePredicate();
                    return { type: "Predicate", pred };
                }
                return { type: "Term", value: tok.value };
            case TokenKind.Fuzzy:
                this.next();
                return { type: "FuzzyTerm", value: this.parseTerm() };
            case TokenKind.String:
                return { type: "Term", value: tok.value };
            default:
                throw new QueryParseError("Expected term, predicate, or '('", tok.pos);
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
        if (tok.kind !== TokenKind.Ident)
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
        if (!isValidFieldName(field)) {
            throw new QueryParseError("Invalid field name", tok.pos);
        }
        let pred;
        const opTok = this.peek();
        const op = parseOperator(opTok.kind);
        this.next();
        switch (op) {
            case Op.In:
                pred = { field, op, values: this.parseList() };
                break;
            case Op.Like:
            case Op.Contains:
            case Op.Fuzzy:
            case Op.StartsWith:
            case Op.EndsWith:
                // STARTS WITH and ENDS WITH need "WITH" keyword
                if (op === Op.StartsWith) {
                    this.expect(TokenKind.With, "Expected WITH after STARTS");
                }
                else if (op === Op.EndsWith) {
                    this.expect(TokenKind.With, "Expected WITH after ENDS");
                }
                pred = { field, op, values: [this.parseValue()] };
                break;
            case Op.Between:
                pred = { field, op, values: this.parseBetween() };
                break;
            case Op.Exists:
                pred = { field, op, values: [] };
                break;
            case Op.IsNull:
            case Op.IsNotNull:
                pred = { field, op, values: [] };
                break;
            case Op.Regex:
            case Op.NotRegex: {
                const lit = this.parseValue();
                if (lit.type !== "Str") {
                    throw new QueryParseError("REGEX expects a string literal", this.peek().pos);
                }
                validateRegexPattern(lit.value, this.peek().pos);
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
        if (tok.kind === TokenKind.Ident || tok.kind === TokenKind.String) {
            return tok.value;
        }
        throw new QueryParseError("Expected term", tok.pos);
    }
    /**
     * Parse a literal value.
     */
    parseValue() {
        const tok = this.next();
        switch (tok.kind) {
            case TokenKind.String:
                return { type: "Str", value: tok.value };
            case TokenKind.Ident:
                return { type: "Str", value: tok.value };
            case TokenKind.Number:
                return { type: "Num", value: tok.value };
            case TokenKind.Bool:
                return { type: "Bool", value: tok.value };
            case TokenKind.Null:
                return { type: "Null" };
            default:
                throw new QueryParseError("Expected value", tok.pos);
        }
    }
    /**
     * Parse a value that can also be a field reference.
     */
    parseValueFieldable() {
        const tok = this.next();
        switch (tok.kind) {
            case TokenKind.String:
                return { type: "Str", value: tok.value };
            case TokenKind.Ident:
                return { type: "Field", value: tok.value };
            case TokenKind.Number:
                return { type: "Num", value: tok.value };
            case TokenKind.Bool:
                return { type: "Bool", value: tok.value };
            case TokenKind.Null:
                return { type: "Null" };
            default:
                throw new QueryParseError("Expected value", tok.pos);
        }
    }
    /**
     * Parse comma-separated list in parentheses.
     * Used for IN clause.
     */
    parseList() {
        this.expect(TokenKind.LParen, "Expected '(' after IN");
        const values = [];
        if (this.peek().kind === TokenKind.RParen) {
            this.next();
            return values;
        }
        while (true) {
            values.push(this.parseValue());
            if (this.peek().kind === TokenKind.Comma) {
                this.next();
                continue;
            }
            if (this.peek().kind === TokenKind.RParen) {
                this.next();
                break;
            }
            throw new QueryParseError("Expected ',' or ')'", this.peek().pos);
        }
        return values;
    }
    /**
     * Parse BETWEEN clause.
     * Supports both: BETWEEN (a, b) and BETWEEN a AND b
     */
    parseBetween() {
        if (this.peek().kind === TokenKind.LParen) {
            this.next();
            const first = this.parseValueFieldable();
            this.expect(TokenKind.Comma, "Expected ',' in BETWEEN");
            const second = this.parseValueFieldable();
            this.expect(TokenKind.RParen, "Expected ')' after BETWEEN");
            return [first, second];
        }
        const first = this.parseValueFieldable();
        this.expect(TokenKind.And, "Expected AND in BETWEEN");
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
            if (tok.kind === TokenKind.Ident) {
                fields.push(tok.value);
                this.next();
            }
            else if (tok.kind === TokenKind.Score) {
                fields.push("SCORE");
                this.next();
            }
            else {
                throw new QueryParseError("Expected field in SELECT", tok.pos);
            }
            if (this.peek().kind === TokenKind.Comma) {
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
        if (tok.kind === TokenKind.Ident) {
            field = tok.value;
            this.next();
        }
        else if (tok.kind === TokenKind.Score) {
            field = "SCORE";
            this.next();
        }
        else {
            throw new QueryParseError("Expected field after ORDER BY", tok.pos);
        }
        let desc = false;
        if (this.peek().kind === TokenKind.Desc) {
            desc = true;
            this.next();
        }
        else if (this.peek().kind === TokenKind.Asc) {
            this.next();
        }
        let nullsFirst = null;
        if (this.peek().kind === TokenKind.Nulls) {
            this.next();
            const nf = this.peek();
            if (nf.kind === TokenKind.First) {
                nullsFirst = true;
                this.next();
            }
            else if (nf.kind === TokenKind.Last) {
                nullsFirst = false;
                this.next();
            }
            else {
                throw new QueryParseError("Expected FIRST or LAST after NULLS", this.peek().pos);
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
            throw new QueryParseError(`Max nesting depth exceeded (${MAX_NESTING_DEPTH})`, this.peek().pos);
        }
    }
    exitDepth() {
        if (this.depth > 0)
            this.depth--;
    }
}
// ============================================================================
// Helper Functions
// ============================================================================
/**
 * Check if token kind starts a predicate.
 */
function isPredicateOp(kind) {
    return (kind === TokenKind.In ||
        kind === TokenKind.Like ||
        kind === TokenKind.Regex ||
        kind === TokenKind.Fuzzy ||
        kind === TokenKind.Not ||
        kind === TokenKind.Between ||
        kind === TokenKind.Contains ||
        kind === TokenKind.Starts ||
        kind === TokenKind.Ends ||
        kind === TokenKind.Exists ||
        kind === TokenKind.Is ||
        kind === TokenKind.Eq ||
        kind === TokenKind.Neq ||
        kind === TokenKind.Gt ||
        kind === TokenKind.Gte ||
        kind === TokenKind.Lt ||
        kind === TokenKind.Lte);
}
/**
 * Check if token kind is a query modifier (ORDER, LIMIT, etc.)
 */
function isQueryModifier(kind) {
    return (kind === TokenKind.Order ||
        kind === TokenKind.Limit ||
        kind === TokenKind.Offset ||
        kind === TokenKind.Case ||
        kind === TokenKind.Strict ||
        kind === TokenKind.Eof);
}
/**
 * Convert TokenKind to Op enum.
 */
function parseOperator(kind) {
    switch (kind) {
        case TokenKind.In: return Op.In;
        case TokenKind.Like: return Op.Like;
        case TokenKind.Regex: return Op.Regex;
        case TokenKind.Fuzzy: return Op.Fuzzy;
        case TokenKind.Between: return Op.Between;
        case TokenKind.Contains: return Op.Contains;
        case TokenKind.Starts: return Op.StartsWith;
        case TokenKind.Ends: return Op.EndsWith;
        case TokenKind.Exists: return Op.Exists;
        case TokenKind.Is: return Op.IsNull;
        case TokenKind.Eq: return Op.Eq;
        case TokenKind.Neq: return Op.Neq;
        case TokenKind.Gt: return Op.Gt;
        case TokenKind.Gte: return Op.Gte;
        case TokenKind.Lt: return Op.Lt;
        case TokenKind.Lte: return Op.Lte;
        default:
            throw new QueryParseError("Expected operator", 0);
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
        if (pred.op === Op.Regex || pred.op === Op.NotRegex) {
            if (pred.values[0]?.type === "Regex") {
                try {
                    pred.values[0] = { type: "RegexCompiled", value: new RegExp(pred.values[0].value) };
                }
                catch {
                    throw new QueryParseError("Invalid REGEX pattern", 0);
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
export function parseQuery(query) {
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
export function validateQuery(query) {
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