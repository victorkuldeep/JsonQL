"use strict";
/**
 * JSON Search Engine - Core Type Definitions
 *
 * This file contains all type definitions used throughout the search engine.
 * It defines the query AST, token kinds, and configuration interfaces.
 *
 * @module types
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryParseError = exports.Op = exports.TokenKind = void 0;
// ============================================================================
// Token Types - Lexer/Parser
// ============================================================================
/**
 * Token kinds recognized by the lexer.
 * These represent all valid lexical elements in query strings.
 * Keywords are case-insensitive in queries but stored as PascalCase here.
 */
var TokenKind;
(function (TokenKind) {
    /** SELECT keyword - for field projection */
    TokenKind["Select"] = "Select";
    /** WHERE keyword - for condition start */
    TokenKind["Where"] = "Where";
    /** AND operator - logical AND */
    TokenKind["And"] = "And";
    /** OR operator - logical OR */
    TokenKind["Or"] = "Or";
    /** NOT operator - logical negation */
    TokenKind["Not"] = "Not";
    /** FUZZY operator - fuzzy text search */
    TokenKind["Fuzzy"] = "Fuzzy";
    /** IN operator - membership test */
    TokenKind["In"] = "In";
    /** LIKE operator - pattern matching */
    TokenKind["Like"] = "Like";
    /** REGEX operator - regex matching */
    TokenKind["Regex"] = "Regex";
    /** ORDER keyword - ordering start */
    TokenKind["Order"] = "Order";
    /** BY keyword - ordering direction */
    TokenKind["By"] = "By";
    /** LIMIT keyword - result limit */
    TokenKind["Limit"] = "Limit";
    /** OFFSET keyword - result offset */
    TokenKind["Offset"] = "Offset";
    /** ASC keyword - ascending order */
    TokenKind["Asc"] = "Asc";
    /** DESC keyword - descending order */
    TokenKind["Desc"] = "Desc";
    /** NULLS keyword - null ordering */
    TokenKind["Nulls"] = "Nulls";
    /** FIRST keyword - nulls first */
    TokenKind["First"] = "First";
    /** LAST keyword - nulls last */
    TokenKind["Last"] = "Last";
    /** SCORE keyword - relevance score */
    TokenKind["Score"] = "Score";
    /** CASE keyword - case sensitivity */
    TokenKind["Case"] = "Case";
    /** SENSITIVE keyword - case sensitive */
    TokenKind["Sensitive"] = "Sensitive";
    /** INSENSITIVE keyword - case insensitive */
    TokenKind["Insensitive"] = "Insensitive";
    /** STRICT keyword - strict mode */
    TokenKind["Strict"] = "Strict";
    /** BETWEEN operator - range test */
    TokenKind["Between"] = "Between";
    /** CONTAINS operator - substring test */
    TokenKind["Contains"] = "Contains";
    /** STARTS WITH operator - prefix test */
    TokenKind["Starts"] = "Starts";
    /** ENDS WITH operator - suffix test */
    TokenKind["Ends"] = "Ends";
    /** EXISTS operator - field existence */
    TokenKind["Exists"] = "Exists";
    /** IS keyword - null check */
    TokenKind["Is"] = "Is";
    /** WITH keyword - paired with other keywords */
    TokenKind["With"] = "With";
    /** = operator - equality */
    TokenKind["Eq"] = "Eq";
    /** != operator - inequality */
    TokenKind["Neq"] = "Neq";
    /** > operator - greater than */
    TokenKind["Gt"] = "Gt";
    /** >= operator - greater or equal */
    TokenKind["Gte"] = "Gte";
    /** < operator - less than */
    TokenKind["Lt"] = "Lt";
    /** <= operator - less or equal */
    TokenKind["Lte"] = "Lte";
    /** ( character - left parenthesis */
    TokenKind["LParen"] = "LParen";
    /** ) character - right parenthesis */
    TokenKind["RParen"] = "RParen";
    /** , character - comma separator */
    TokenKind["Comma"] = "Comma";
    /** [ character - left bracket */
    TokenKind["LBrack"] = "LBrack";
    /** ] character - right bracket */
    TokenKind["RBrack"] = "RBrack";
    /** Identifier - field names, keywords */
    TokenKind["Ident"] = "Ident";
    /** String literal - quoted text */
    TokenKind["String"] = "String";
    /** Number literal */
    TokenKind["Number"] = "Number";
    /** Boolean literal - true/false */
    TokenKind["Bool"] = "Bool";
    /** Null literal */
    TokenKind["Null"] = "Null";
    /** End of input marker */
    TokenKind["Eof"] = "Eof";
})(TokenKind || (exports.TokenKind = TokenKind = {}));
/**
 * Comparison operators for predicates.
 * These map to SQL-like operators in queries.
 */
var Op;
(function (Op) {
    /** IN - value in list */
    Op["In"] = "In";
    /** NOT IN - value not in list */
    Op["NotIn"] = "NotIn";
    /** LIKE - pattern match */
    Op["Like"] = "Like";
    /** NOT LIKE - negated pattern */
    Op["NotLike"] = "NotLike";
    /** REGEX - regex match */
    Op["Regex"] = "Regex";
    /** NOT REGEX - negated regex */
    Op["NotRegex"] = "NotRegex";
    /** FUZZY - fuzzy match */
    Op["Fuzzy"] = "Fuzzy";
    /** NOT FUZZY - negated fuzzy */
    Op["NotFuzzy"] = "NotFuzzy";
    /** BETWEEN - value in range */
    Op["Between"] = "Between";
    /** CONTAINS - substring */
    Op["Contains"] = "Contains";
    /** STARTS WITH - prefix */
    Op["StartsWith"] = "StartsWith";
    /** ENDS WITH - suffix */
    Op["EndsWith"] = "EndsWith";
    /** EXISTS - field exists */
    Op["Exists"] = "Exists";
    /** IS NULL - null check */
    Op["IsNull"] = "IsNull";
    /** IS NOT NULL - not null check */
    Op["IsNotNull"] = "IsNotNull";
    /** = - equality */
    Op["Eq"] = "Eq";
    /** != - inequality */
    Op["Neq"] = "Neq";
    /** > - greater than */
    Op["Gt"] = "Gt";
    /** >= - greater or equal */
    Op["Gte"] = "Gte";
    /** < - less than */
    Op["Lt"] = "Lt";
    /** <= - less or equal */
    Op["Lte"] = "Lte";
})(Op || (exports.Op = Op = {}));
// ============================================================================
// Error Types
// ============================================================================
/**
 * Query parse error with position information.
 * Thrown when query syntax is invalid.
 */
class QueryParseError extends Error {
    message;
    pos;
    constructor(message, pos) {
        super(message);
        this.message = message;
        this.pos = pos;
        this.name = "QueryParseError";
    }
}
exports.QueryParseError = QueryParseError;
//# sourceMappingURL=types.js.map