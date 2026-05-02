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
import { Token } from "./types.js";
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
export declare class Lexer {
    /** Accumulated tokens */
    private tokens;
    /** Current position in input */
    private pos;
    /** Original input string */
    private input;
    /**
     * Tokenize a query string into a token stream.
     *
     * @param input - Raw query string
     * @returns Array of tokens
     * @throws QueryParseError if query is too long or contains invalid characters
     */
    tokenize(input: string): Token[];
    /**
     * Read a string literal.
     * Handles both single and double quotes.
     * Supports escape sequences (\\, \", \').
     */
    private readString;
    /**
     * Read a numeric literal.
     * Handles integers and decimals.
     */
    private readNumber;
    /**
     * Read an identifier or keyword.
     * Converts to uppercase to match against keywords.
     * Handles TRUE, FALSE, NULL as boolean/null literals.
     */
    private readIdent;
}
/**
 * Check if a string is a valid field name.
 * Must be non-empty and contain only alphanumeric, underscore, or dot.
 */
export declare function isValidFieldName(field: string): boolean;
/**
 * Validate a regex pattern for safety.
 * Prevents ReDoS (Regular Expression Denial of Service) attacks.
 *
 * @param pattern - The regex pattern string
 * @param pos - Position in query for error reporting
 * @throws QueryParseError if pattern is unsafe
 */
export declare function validateRegexPattern(pattern: string, pos: number): void;
//# sourceMappingURL=lexer.d.ts.map