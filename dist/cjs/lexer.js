"use strict";
/**
 * JSON Search Engine - Lexer (Tokenizer)
 *
 * The lexer converts a query string into a stream of tokens.
 * It's the first stage of query processing.
 *
 * Tokenization process:
 * 1. Read characters one by one
 * 2. Identify token type (keyword, identifier, string, number, operator)
 * 3. Build token list with position information
 *
 * @module lexer
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Lexer = void 0;
exports.isValidFieldName = isValidFieldName;
exports.validateRegexPattern = validateRegexPattern;
const types_js_1 = require("./types.js");
/**
 * Lexer class for tokenizing query strings.
 *
 * Handles:
 * - Keywords (SELECT, WHERE, AND, OR, etc.)
 * - Identifiers (field names)
 * - String/number/boolean literals
 * - Operators (=, !=, >, <, etc.)
 * - Parentheses and commas
 *
 * @example
 * ```typescript
 * const lexer = new Lexer();
 * const tokens = lexer.tokenize('country = "USA" AND age > 25');
 * // [
 * //   { kind: TokenKind.Ident, value: "country", pos: 0 },
 * //   { kind: TokenKind.Eq, value: null, pos: 8 },
 * //   { kind: TokenKind.String, value: "USA", pos: 10 },
 * //   { kind: TokenKind.And, value: null, pos: 16 },
 * //   { kind: TokenKind.Ident, value: "age", pos: 20 },
 * //   { kind: TokenKind.Gt, value: null, pos: 24 },
 * //   { kind: TokenKind.Number, value: 25, pos: 26 },
 * //   { kind: TokenKind.Eof, value: null, pos: 28 }
 * // ]
 * ```
 */
class Lexer {
    /** Accumulated tokens */
    tokens = [];
    /** Current position in input */
    pos = 0;
    /** Original input string */
    input = "";
    /**
     * Tokenize a query string into a token stream.
     *
     * @param input - Raw query string
     * @returns Array of tokens
     * @throws QueryParseError if query is too long or contains invalid characters
     */
    tokenize(input) {
        this.input = input;
        this.pos = 0;
        this.tokens = [];
        // Limit query length to prevent DoS
        if (input.length > 8192) {
            throw new types_js_1.QueryParseError(`Query length exceeds 8192 characters`, 0);
        }
        // Main tokenization loop
        while (this.pos < this.input.length) {
            const c = this.input[this.pos];
            // Skip whitespace
            if (isWhitespace(c)) {
                this.pos++;
                continue;
            }
            switch (c) {
                case "(":
                    this.tokens.push({ kind: types_js_1.TokenKind.LParen, value: null, pos: this.pos });
                    this.pos++;
                    break;
                case ")":
                    this.tokens.push({ kind: types_js_1.TokenKind.RParen, value: null, pos: this.pos });
                    this.pos++;
                    break;
                case ",":
                    this.tokens.push({ kind: types_js_1.TokenKind.Comma, value: null, pos: this.pos });
                    this.pos++;
                    break;
                case "=":
                    this.tokens.push({ kind: types_js_1.TokenKind.Eq, value: null, pos: this.pos });
                    this.pos++;
                    break;
                case "!":
                    // Handle != operator
                    if (this.input[this.pos + 1] === "=") {
                        this.tokens.push({ kind: types_js_1.TokenKind.Neq, value: null, pos: this.pos });
                        this.pos += 2;
                    }
                    else {
                        throw new types_js_1.QueryParseError(`Unexpected character: !`, this.pos);
                    }
                    break;
                case ">":
                    // Handle > and >= operators
                    if (this.input[this.pos + 1] === "=") {
                        this.tokens.push({ kind: types_js_1.TokenKind.Gte, value: null, pos: this.pos });
                        this.pos += 2;
                    }
                    else {
                        this.tokens.push({ kind: types_js_1.TokenKind.Gt, value: null, pos: this.pos });
                        this.pos++;
                    }
                    break;
                case "<":
                    // Handle < and <= operators
                    if (this.input[this.pos + 1] === "=") {
                        this.tokens.push({ kind: types_js_1.TokenKind.Lte, value: null, pos: this.pos });
                        this.pos += 2;
                    }
                    else {
                        this.tokens.push({ kind: types_js_1.TokenKind.Lt, value: null, pos: this.pos });
                        this.pos++;
                    }
                    break;
                case "'":
                case "\"":
                    // String literals
                    this.readString(c);
                    break;
                default:
                    // Number or identifier
                    if (isDigit(c) || (c === "." && isDigit(this.input[this.pos + 1]))) {
                        this.readNumber();
                    }
                    else if (isAlpha(c) || c === "_") {
                        this.readIdent();
                    }
                    else {
                        throw new types_js_1.QueryParseError(`Unexpected character: ${c}`, this.pos);
                    }
            }
        }
        // Add end-of-file marker
        this.tokens.push({ kind: types_js_1.TokenKind.Eof, value: null, pos: this.pos });
        return this.tokens;
    }
    /**
     * Read a string literal.
     * Handles both single and double quotes.
     * Supports escape sequences (\\, \", \').
     */
    readString(quote) {
        const start = this.pos;
        this.pos++;
        let s = "";
        while (this.pos < this.input.length) {
            const c = this.input[this.pos];
            if (c === quote) {
                this.pos++;
                this.tokens.push({ kind: types_js_1.TokenKind.String, value: s, pos: start });
                return;
            }
            // Handle escape sequences
            if (c === "\\" && this.pos + 1 < this.input.length) {
                this.pos++;
                s += this.input[this.pos];
                this.pos++;
                continue;
            }
            s += c;
            this.pos++;
        }
        throw new types_js_1.QueryParseError("Unterminated string literal", start);
    }
    /**
     * Read a numeric literal.
     * Handles integers and decimals.
     */
    readNumber() {
        const start = this.pos;
        let s = "";
        while (this.pos < this.input.length && (isDigit(this.input[this.pos]) || this.input[this.pos] === ".")) {
            s += this.input[this.pos];
            this.pos++;
        }
        const num = parseFloat(s);
        if (isNaN(num)) {
            throw new types_js_1.QueryParseError("Invalid number", start);
        }
        this.tokens.push({ kind: types_js_1.TokenKind.Number, value: num, pos: start });
    }
    /**
     * Read an identifier or keyword.
     * Converts to uppercase to match against keywords.
     * Handles TRUE, FALSE, NULL as boolean/null literals.
     */
    readIdent() {
        const start = this.pos;
        let s = "";
        while (this.pos < this.input.length && isAlphaNum(this.input[this.pos])) {
            s += this.input[this.pos];
            this.pos++;
        }
        const upper = s.toUpperCase();
        const kind = keywordKind(upper);
        if (kind) {
            // It's a keyword
            this.tokens.push({ kind, value: null, pos: start });
        }
        else if (upper === "TRUE") {
            this.tokens.push({ kind: types_js_1.TokenKind.Bool, value: true, pos: start });
        }
        else if (upper === "FALSE") {
            this.tokens.push({ kind: types_js_1.TokenKind.Bool, value: false, pos: start });
        }
        else if (upper === "NULL") {
            this.tokens.push({ kind: types_js_1.TokenKind.Null, value: null, pos: start });
        }
        else {
            // It's a field identifier
            this.tokens.push({ kind: types_js_1.TokenKind.Ident, value: s, pos: start });
        }
    }
}
exports.Lexer = Lexer;
// ============================================================================
// Character Classification
// ============================================================================
/**
 * Check if character is whitespace.
 */
function isWhitespace(c) {
    return c === " " || c === "\t" || c === "\n" || c === "\r";
}
/**
 * Check if character is a digit (0-9).
 */
function isDigit(c) {
    return c !== undefined && c >= "0" && c <= "9";
}
/**
 * Check if character is alphabetic (a-z, A-Z).
 */
function isAlpha(c) {
    return (c >= "a" && c <= "z") || (c >= "A" && c <= "Z");
}
/**
 * Check if character is alphanumeric or underscore/dot.
 * Used for field name validation.
 */
function isAlphaNum(c) {
    return isAlpha(c) || isDigit(c) || c === "_" || c === ".";
}
// ============================================================================
// Keyword Lookup
// ============================================================================
/**
 * Map uppercase keyword to TokenKind.
 * Returns null if not a keyword.
 */
function keywordKind(s) {
    const keywords = {
        SELECT: types_js_1.TokenKind.Select,
        WHERE: types_js_1.TokenKind.Where,
        AND: types_js_1.TokenKind.And,
        OR: types_js_1.TokenKind.Or,
        NOT: types_js_1.TokenKind.Not,
        FUZZY: types_js_1.TokenKind.Fuzzy,
        IN: types_js_1.TokenKind.In,
        LIKE: types_js_1.TokenKind.Like,
        REGEX: types_js_1.TokenKind.Regex,
        ORDER: types_js_1.TokenKind.Order,
        BY: types_js_1.TokenKind.By,
        LIMIT: types_js_1.TokenKind.Limit,
        OFFSET: types_js_1.TokenKind.Offset,
        ASC: types_js_1.TokenKind.Asc,
        DESC: types_js_1.TokenKind.Desc,
        NULLS: types_js_1.TokenKind.Nulls,
        FIRST: types_js_1.TokenKind.First,
        LAST: types_js_1.TokenKind.Last,
        SCORE: types_js_1.TokenKind.Score,
        CASE: types_js_1.TokenKind.Case,
        SENSITIVE: types_js_1.TokenKind.Sensitive,
        INSENSITIVE: types_js_1.TokenKind.Insensitive,
        STRICT: types_js_1.TokenKind.Strict,
        BETWEEN: types_js_1.TokenKind.Between,
        CONTAINS: types_js_1.TokenKind.Contains,
        STARTS: types_js_1.TokenKind.Starts,
        ENDS: types_js_1.TokenKind.Ends,
        EXISTS: types_js_1.TokenKind.Exists,
        IS: types_js_1.TokenKind.Is,
    };
    return keywords[s] || null;
}
// ============================================================================
// Validation Functions
// ============================================================================
/**
 * Check if a string is a valid field name.
 * Must be non-empty and contain only alphanumeric, underscore, or dot.
 */
function isValidFieldName(field) {
    if (field.length === 0)
        return false;
    for (const c of field) {
        if (!isAlphaNum(c) && c !== "_" && c !== ".")
            return false;
    }
    return true;
}
/**
 * Validate a regex pattern for safety.
 * Prevents ReDoS (Regular Expression Denial of Service) attacks.
 *
 * @param pattern - The regex pattern string
 * @param pos - Position in query for error reporting
 * @throws QueryParseError if pattern is unsafe
 */
function validateRegexPattern(pattern, pos) {
    // Limit pattern length
    if (pattern.length > 256) {
        throw new types_js_1.QueryParseError(`REGEX pattern too long (max 256)`, pos);
    }
    //Reject potentially dangerous patterns
    const banned = [")+", ")*", "){", ")+?", ")*?"];
    for (const b of banned) {
        if (pattern.includes(b)) {
            throw new types_js_1.QueryParseError("REGEX pattern rejected (potential ReDoS)", pos);
        }
    }
    // Additional dangerous patterns
    if (pattern.includes("++") || pattern.includes("**") || pattern.includes("{,")) {
        throw new types_js_1.QueryParseError("REGEX pattern rejected (potential ReDoS)", pos);
    }
}
//# sourceMappingURL=lexer.js.map