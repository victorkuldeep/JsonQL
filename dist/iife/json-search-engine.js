var JsonSearchEngine = (function (exports) {
  'use strict';

  /**
   * JSON Search Engine - Core Type Definitions
   *
   * This file contains all type definitions used throughout the search engine.
   * It defines the query AST, token kinds, and configuration interfaces.
   *
   * @module types
   */
  // ============================================================================
  // Token Types - Lexer/Parser
  // ============================================================================
  /**
   * Token kinds recognized by the lexer.
   * These represent all valid lexical elements in query strings.
   * Keywords are case-insensitive in queries but stored as PascalCase here.
   */
  exports.TokenKind = void 0;
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
  })(exports.TokenKind || (exports.TokenKind = {}));
  /**
   * Comparison operators for predicates.
   * These map to SQL-like operators in queries.
   */
  exports.Op = void 0;
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
  })(exports.Op || (exports.Op = {}));
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
              throw new QueryParseError(`Query length exceeds 8192 characters`, 0);
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
                      this.tokens.push({ kind: exports.TokenKind.LParen, value: null, pos: this.pos });
                      this.pos++;
                      break;
                  case ")":
                      this.tokens.push({ kind: exports.TokenKind.RParen, value: null, pos: this.pos });
                      this.pos++;
                      break;
                  case ",":
                      this.tokens.push({ kind: exports.TokenKind.Comma, value: null, pos: this.pos });
                      this.pos++;
                      break;
                  case "=":
                      this.tokens.push({ kind: exports.TokenKind.Eq, value: null, pos: this.pos });
                      this.pos++;
                      break;
                  case "!":
                      // Handle != operator
                      if (this.input[this.pos + 1] === "=") {
                          this.tokens.push({ kind: exports.TokenKind.Neq, value: null, pos: this.pos });
                          this.pos += 2;
                      }
                      else {
                          throw new QueryParseError(`Unexpected character: !`, this.pos);
                      }
                      break;
                  case ">":
                      // Handle > and >= operators
                      if (this.input[this.pos + 1] === "=") {
                          this.tokens.push({ kind: exports.TokenKind.Gte, value: null, pos: this.pos });
                          this.pos += 2;
                      }
                      else {
                          this.tokens.push({ kind: exports.TokenKind.Gt, value: null, pos: this.pos });
                          this.pos++;
                      }
                      break;
                  case "<":
                      // Handle < and <= operators
                      if (this.input[this.pos + 1] === "=") {
                          this.tokens.push({ kind: exports.TokenKind.Lte, value: null, pos: this.pos });
                          this.pos += 2;
                      }
                      else {
                          this.tokens.push({ kind: exports.TokenKind.Lt, value: null, pos: this.pos });
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
                          throw new QueryParseError(`Unexpected character: ${c}`, this.pos);
                      }
              }
          }
          // Add end-of-file marker
          this.tokens.push({ kind: exports.TokenKind.Eof, value: null, pos: this.pos });
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
                  this.tokens.push({ kind: exports.TokenKind.String, value: s, pos: start });
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
          throw new QueryParseError("Unterminated string literal", start);
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
              throw new QueryParseError("Invalid number", start);
          }
          this.tokens.push({ kind: exports.TokenKind.Number, value: num, pos: start });
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
              this.tokens.push({ kind: exports.TokenKind.Bool, value: true, pos: start });
          }
          else if (upper === "FALSE") {
              this.tokens.push({ kind: exports.TokenKind.Bool, value: false, pos: start });
          }
          else if (upper === "NULL") {
              this.tokens.push({ kind: exports.TokenKind.Null, value: null, pos: start });
          }
          else {
              // It's a field identifier
              this.tokens.push({ kind: exports.TokenKind.Ident, value: s, pos: start });
          }
      }
  }
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
          SELECT: exports.TokenKind.Select,
          WHERE: exports.TokenKind.Where,
          AND: exports.TokenKind.And,
          OR: exports.TokenKind.Or,
          NOT: exports.TokenKind.Not,
          FUZZY: exports.TokenKind.Fuzzy,
          IN: exports.TokenKind.In,
          LIKE: exports.TokenKind.Like,
          REGEX: exports.TokenKind.Regex,
          ORDER: exports.TokenKind.Order,
          BY: exports.TokenKind.By,
          LIMIT: exports.TokenKind.Limit,
          OFFSET: exports.TokenKind.Offset,
          ASC: exports.TokenKind.Asc,
          DESC: exports.TokenKind.Desc,
          NULLS: exports.TokenKind.Nulls,
          FIRST: exports.TokenKind.First,
          LAST: exports.TokenKind.Last,
          SCORE: exports.TokenKind.Score,
          CASE: exports.TokenKind.Case,
          SENSITIVE: exports.TokenKind.Sensitive,
          INSENSITIVE: exports.TokenKind.Insensitive,
          STRICT: exports.TokenKind.Strict,
          BETWEEN: exports.TokenKind.Between,
          CONTAINS: exports.TokenKind.Contains,
          STARTS: exports.TokenKind.Starts,
          ENDS: exports.TokenKind.Ends,
          EXISTS: exports.TokenKind.Exists,
          IS: exports.TokenKind.Is,
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
          throw new QueryParseError(`REGEX pattern too long (max 256)`, pos);
      }
      //Reject potentially dangerous patterns
      const banned = [")+", ")*", "){", ")+?", ")*?"];
      for (const b of banned) {
          if (pattern.includes(b)) {
              throw new QueryParseError("REGEX pattern rejected (potential ReDoS)", pos);
          }
      }
      // Additional dangerous patterns
      if (pattern.includes("++") || pattern.includes("**") || pattern.includes("{,")) {
          throw new QueryParseError("REGEX pattern rejected (potential ReDoS)", pos);
      }
  }

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
          const lexer = new Lexer();
          const tokens = lexer.tokenize(normalized);
          this.tokens = tokens;
          this.pos = 0;
          this.depth = 0;
          // Empty query - match all
          if (this.peek().kind === exports.TokenKind.Eof) {
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
          if (this.peek().kind === exports.TokenKind.Select) {
              this.next();
              projection = this.parseProjectionList();
              if (this.peek().kind === exports.TokenKind.Where) {
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
          while (this.peek().kind !== exports.TokenKind.Eof) {
              const tok = this.peek();
              switch (tok.kind) {
                  case exports.TokenKind.Case:
                      this.next();
                      const cs = this.peek();
                      if (cs.kind === exports.TokenKind.Sensitive) {
                          caseSensitive = true;
                          this.next();
                      }
                      else if (cs.kind === exports.TokenKind.Insensitive) {
                          caseSensitive = false;
                          this.next();
                      }
                      else {
                          throw new QueryParseError("Expected SENSITIVE or INSENSITIVE after CASE", this.peek().pos);
                      }
                      break;
                  case exports.TokenKind.Strict:
                      this.next();
                      strict = true;
                      break;
                  case exports.TokenKind.Order:
                      this.next();
                      this.expect(exports.TokenKind.By, "Expected BY after ORDER");
                      orderBy.push(this.parseOrderBy());
                      break;
                  case exports.TokenKind.Limit:
                      this.next();
                      const ln = this.peek();
                      if (ln.kind !== exports.TokenKind.Number) {
                          throw new QueryParseError("Expected number after LIMIT", this.peek().pos);
                      }
                      limit = ln.value;
                      if (limit < 0) {
                          throw new QueryParseError("LIMIT must be non-negative", this.peek().pos);
                      }
                      this.next();
                      break;
                  case exports.TokenKind.Offset:
                      this.next();
                      const os = this.peek();
                      if (os.kind !== exports.TokenKind.Number) {
                          throw new QueryParseError("Expected number after OFFSET", this.peek().pos);
                      }
                      offset = os.value;
                      if (offset < 0) {
                          throw new QueryParseError("OFFSET must be non-negative", this.peek().pos);
                      }
                      this.next();
                      break;
                  case exports.TokenKind.Eof:
                      break;
                  default:
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
          while (this.peek().kind === exports.TokenKind.Or) {
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
          while (this.peek().kind === exports.TokenKind.And) {
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
          if (this.peek().kind === exports.TokenKind.Not) {
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
              case exports.TokenKind.LParen:
                  this.next();
                  this.enterDepth();
                  const expr = this.parseOr();
                  this.exitDepth();
                  this.expect(exports.TokenKind.RParen, "Expected ')'");
                  return expr;
              case exports.TokenKind.Eof:
                  return { type: "All" };
              case exports.TokenKind.Ident:
                  // Could be predicate or full-text term
                  if (this.isPredicateStart()) {
                      const pred = this.parsePredicate();
                      return { type: "Predicate", pred };
                  }
                  return { type: "Term", value: tok.value };
              case exports.TokenKind.Fuzzy:
                  this.next();
                  return { type: "FuzzyTerm", value: this.parseTerm() };
              case exports.TokenKind.String:
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
          if (tok.kind !== exports.TokenKind.Ident)
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
              case exports.Op.In:
                  pred = { field, op, values: this.parseList() };
                  break;
              case exports.Op.Like:
              case exports.Op.Contains:
              case exports.Op.Fuzzy:
              case exports.Op.StartsWith:
              case exports.Op.EndsWith:
                  // STARTS WITH and ENDS WITH need "WITH" keyword
                  if (op === exports.Op.StartsWith) {
                      this.expect(exports.TokenKind.With, "Expected WITH after STARTS");
                  }
                  else if (op === exports.Op.EndsWith) {
                      this.expect(exports.TokenKind.With, "Expected WITH after ENDS");
                  }
                  pred = { field, op, values: [this.parseValue()] };
                  break;
              case exports.Op.Between:
                  pred = { field, op, values: this.parseBetween() };
                  break;
              case exports.Op.Exists:
                  pred = { field, op, values: [] };
                  break;
              case exports.Op.IsNull:
              case exports.Op.IsNotNull:
                  pred = { field, op, values: [] };
                  break;
              case exports.Op.Regex:
              case exports.Op.NotRegex: {
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
          if (tok.kind === exports.TokenKind.Ident || tok.kind === exports.TokenKind.String) {
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
              case exports.TokenKind.String:
                  return { type: "Str", value: tok.value };
              case exports.TokenKind.Ident:
                  return { type: "Str", value: tok.value };
              case exports.TokenKind.Number:
                  return { type: "Num", value: tok.value };
              case exports.TokenKind.Bool:
                  return { type: "Bool", value: tok.value };
              case exports.TokenKind.Null:
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
              case exports.TokenKind.String:
                  return { type: "Str", value: tok.value };
              case exports.TokenKind.Ident:
                  return { type: "Field", value: tok.value };
              case exports.TokenKind.Number:
                  return { type: "Num", value: tok.value };
              case exports.TokenKind.Bool:
                  return { type: "Bool", value: tok.value };
              case exports.TokenKind.Null:
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
          this.expect(exports.TokenKind.LParen, "Expected '(' after IN");
          const values = [];
          if (this.peek().kind === exports.TokenKind.RParen) {
              this.next();
              return values;
          }
          while (true) {
              values.push(this.parseValue());
              if (this.peek().kind === exports.TokenKind.Comma) {
                  this.next();
                  continue;
              }
              if (this.peek().kind === exports.TokenKind.RParen) {
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
          if (this.peek().kind === exports.TokenKind.LParen) {
              this.next();
              const first = this.parseValueFieldable();
              this.expect(exports.TokenKind.Comma, "Expected ',' in BETWEEN");
              const second = this.parseValueFieldable();
              this.expect(exports.TokenKind.RParen, "Expected ')' after BETWEEN");
              return [first, second];
          }
          const first = this.parseValueFieldable();
          this.expect(exports.TokenKind.And, "Expected AND in BETWEEN");
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
              if (tok.kind === exports.TokenKind.Ident) {
                  fields.push(tok.value);
                  this.next();
              }
              else if (tok.kind === exports.TokenKind.Score) {
                  fields.push("SCORE");
                  this.next();
              }
              else {
                  throw new QueryParseError("Expected field in SELECT", tok.pos);
              }
              if (this.peek().kind === exports.TokenKind.Comma) {
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
          if (tok.kind === exports.TokenKind.Ident) {
              field = tok.value;
              this.next();
          }
          else if (tok.kind === exports.TokenKind.Score) {
              field = "SCORE";
              this.next();
          }
          else {
              throw new QueryParseError("Expected field after ORDER BY", tok.pos);
          }
          let desc = false;
          if (this.peek().kind === exports.TokenKind.Desc) {
              desc = true;
              this.next();
          }
          else if (this.peek().kind === exports.TokenKind.Asc) {
              this.next();
          }
          let nullsFirst = null;
          if (this.peek().kind === exports.TokenKind.Nulls) {
              this.next();
              const nf = this.peek();
              if (nf.kind === exports.TokenKind.First) {
                  nullsFirst = true;
                  this.next();
              }
              else if (nf.kind === exports.TokenKind.Last) {
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
      return (kind === exports.TokenKind.In ||
          kind === exports.TokenKind.Like ||
          kind === exports.TokenKind.Regex ||
          kind === exports.TokenKind.Fuzzy ||
          kind === exports.TokenKind.Not ||
          kind === exports.TokenKind.Between ||
          kind === exports.TokenKind.Contains ||
          kind === exports.TokenKind.Starts ||
          kind === exports.TokenKind.Ends ||
          kind === exports.TokenKind.Exists ||
          kind === exports.TokenKind.Is ||
          kind === exports.TokenKind.Eq ||
          kind === exports.TokenKind.Neq ||
          kind === exports.TokenKind.Gt ||
          kind === exports.TokenKind.Gte ||
          kind === exports.TokenKind.Lt ||
          kind === exports.TokenKind.Lte);
  }
  /**
   * Check if token kind is a query modifier (ORDER, LIMIT, etc.)
   */
  function isQueryModifier(kind) {
      return (kind === exports.TokenKind.Order ||
          kind === exports.TokenKind.Limit ||
          kind === exports.TokenKind.Offset ||
          kind === exports.TokenKind.Case ||
          kind === exports.TokenKind.Strict ||
          kind === exports.TokenKind.Eof);
  }
  /**
   * Convert TokenKind to Op enum.
   */
  function parseOperator(kind) {
      switch (kind) {
          case exports.TokenKind.In: return exports.Op.In;
          case exports.TokenKind.Like: return exports.Op.Like;
          case exports.TokenKind.Regex: return exports.Op.Regex;
          case exports.TokenKind.Fuzzy: return exports.Op.Fuzzy;
          case exports.TokenKind.Between: return exports.Op.Between;
          case exports.TokenKind.Contains: return exports.Op.Contains;
          case exports.TokenKind.Starts: return exports.Op.StartsWith;
          case exports.TokenKind.Ends: return exports.Op.EndsWith;
          case exports.TokenKind.Exists: return exports.Op.Exists;
          case exports.TokenKind.Is: return exports.Op.IsNull;
          case exports.TokenKind.Eq: return exports.Op.Eq;
          case exports.TokenKind.Neq: return exports.Op.Neq;
          case exports.TokenKind.Gt: return exports.Op.Gt;
          case exports.TokenKind.Gte: return exports.Op.Gte;
          case exports.TokenKind.Lt: return exports.Op.Lt;
          case exports.TokenKind.Lte: return exports.Op.Lte;
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
          if (pred.op === exports.Op.Regex || pred.op === exports.Op.NotRegex) {
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

  /**
   * JSON Search Engine - Utility Functions
   *
   * Common utility functions used throughout the engine.
   * Includes path navigation, cloning, type checking, and normalization.
   *
   * @module utils
   */
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
  function getPath(value, path) {
      let current = value;
      for (const part of path.split(".")) {
          if (current === undefined || current === null)
              return undefined;
          const idx = parseInt(part, 10);
          if (!isNaN(idx)) {
              // Array index
              if (Array.isArray(current)) {
                  current = current[idx];
              }
              else {
                  return undefined;
              }
          }
          else if (typeof current === "object" && current !== null) {
              // Object property
              current = current[part];
          }
          else {
              return undefined;
          }
      }
      return current;
  }
  /**
   * Set a value in a nested object, creating intermediate objects as needed.
   *
   * @param obj - Root object to modify
   * @param path - Dotted path
   * @param value - Value to set
   */
  function setPath(obj, path, value) {
      const parts = path.split(".");
      let current = obj;
      for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          if (!(part in current)) {
              current[part] = {};
          }
          current = current[part];
      }
      current[parts[parts.length - 1]] = value;
  }
  /**
   * Deep clone a JSON value using JSON round-trip.
   *
   * @param value - Value to clone
   * @returns Deep copy of the value
   */
  function cloneJson(value) {
      return JSON.parse(JSON.stringify(value));
  }
  /**
   * Type guard: check if value is a plain object (not array, not null).
   */
  function isObject(value) {
      return typeof value === "object" && value !== null && !Array.isArray(value);
  }
  /**
   * Type guard: check if value is an array.
   */
  function isArray(value) {
      return Array.isArray(value);
  }
  /**
   * Normalize a value for comparison/indexing.
   * Returns a string representation that preserves type information.
   */
  function normalizeValue(value, caseSensitive) {
      if (typeof value === "string") {
          return caseSensitive ? value : value.toLowerCase();
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
      return "";
  }
  /**
   * Normalize a string for comparison.
   */
  function normalizeString(s, caseSensitive) {
      return caseSensitive ? s : s.toLowerCase();
  }
  /**
   * Create a normalized string key for indexing.
   */
  function stringifyKey(value, caseSensitive) {
      return normalizeValue(value, caseSensitive);
  }

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
  // ============================================================================
  // Expression Evaluation
  // ============================================================================
  /**
   * Evaluate an expression against a single data row.
   *
   * @param expr - Parsed expression AST
   * @param item - Data row to evaluate
   * @param options - Evaluation options (case sensitivity, strict mode)
   * @param idx - Row index (for scoring)
   * @returns Whether the row matches
   */
  function evalExpr(expr, item, options, idx) {
      switch (expr.type) {
          case "Or":
              // OR: any part matches
              return expr.parts.some(p => evalExpr(p, item, options, idx));
          case "And":
              // AND: all parts match
              return expr.parts.every(p => evalExpr(p, item, options, idx));
          case "Not":
              // NOT: negation
              return !evalExpr(expr.inner, item, options, idx);
          case "Term":
              // Full-text search term
              return containsText(item, expr.value, options);
          case "FuzzyTerm":
              // Fuzzy search term
              return fuzzyContainsText(item, expr.value, options);
          case "Predicate":
              // Field comparison
              return evalPredicate(expr.pred, item, options, idx);
          case "All":
              // Match everything
              return true;
      }
  }
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
  function evalPredicate(pred, item, options, idx) {
      // Get field value using dotted path (e.g., "meta.region")
      const target = getPath(item, pred.field);
      // Field doesn't exist
      if (!target) {
          return pred.op === exports.Op.IsNull;
      }
      switch (pred.op) {
          // LIKE operator - pattern matching with % and _ wildcards
          case exports.Op.Like:
              if (pred.values[0]?.type === "Str") {
                  if (typeof target === "string") {
                      return likeMatch(target, pred.values[0].value, options.caseSensitive);
                  }
              }
              return false;
          case exports.Op.NotLike:
              if (pred.values[0]?.type === "Str") {
                  if (typeof target === "string") {
                      return !likeMatch(target, pred.values[0].value, options.caseSensitive);
                  }
              }
              return false;
          // REGEX operator - regular expression
          case exports.Op.Regex:
              if (pred.values[0]?.type === "RegexCompiled") {
                  if (typeof target === "string") {
                      return pred.values[0].value.test(target);
                  }
              }
              return false;
          case exports.Op.NotRegex:
              if (pred.values[0]?.type === "RegexCompiled") {
                  if (typeof target === "string") {
                      return !pred.values[0].value.test(target);
                  }
              }
              return false;
          // IN operator - membership in list
          case exports.Op.In:
              return matchesIn(target, pred.values, item, options);
          case exports.Op.NotIn:
              return !matchesIn(target, pred.values, item, options);
          // BETWEEN operator - numeric range
          case exports.Op.Between:
              return betweenMatch(target, pred.values, item, options);
          // CONTAINS operator - substring
          case exports.Op.Contains:
              return containsMatch(target, pred.values[0], item, options);
          // FUZZY operator - fuzzy string matching
          case exports.Op.Fuzzy:
              return fuzzyMatch(target, pred.values[0], item, options);
          // STARTS WITH operator - prefix
          case exports.Op.StartsWith:
              return startsWithMatch(target, pred.values[0], options.caseSensitive);
          // ENDS WITH operator - suffix
          case exports.Op.EndsWith:
              return endsWithMatch(target, pred.values[0], options.caseSensitive);
          // EXISTS operator - field exists
          case exports.Op.Exists:
              return true;
          // IS NULL - value is null
          case exports.Op.IsNull:
              return target === null;
          // IS NOT NULL - value is not null
          case exports.Op.IsNotNull:
              return target !== null;
          // Comparison operators: =, !=, >, >=, <, <=
          case exports.Op.Eq:
              return compareAny(target, pred.values[0], CmpOp.Eq, item, options);
          case exports.Op.Neq:
              return compareAny(target, pred.values[0], CmpOp.Neq, item, options);
          case exports.Op.Gt:
              return compareAny(target, pred.values[0], CmpOp.Gt, item, options);
          case exports.Op.Gte:
              return compareAny(target, pred.values[0], CmpOp.Gte, item, options);
          case exports.Op.Lt:
              return compareAny(target, pred.values[0], CmpOp.Lt, item, options);
          case exports.Op.Lte:
              return compareAny(target, pred.values[0], CmpOp.Lte, item, options);
          default:
              return false;
      }
  }
  // ============================================================================
  // Comparison Operators
  // ============================================================================
  /** Internal comparison operation enum */
  var CmpOp;
  (function (CmpOp) {
      CmpOp[CmpOp["Eq"] = 0] = "Eq";
      CmpOp[CmpOp["Neq"] = 1] = "Neq";
      CmpOp[CmpOp["Gt"] = 2] = "Gt";
      CmpOp[CmpOp["Gte"] = 3] = "Gte";
      CmpOp[CmpOp["Lt"] = 4] = "Lt";
      CmpOp[CmpOp["Lte"] = 5] = "Lte";
  })(CmpOp || (CmpOp = {}));
  /**
   * Check if value is in list (IN operator).
   * Handles both single values and arrays.
   */
  function matchesIn(target, values, item, options) {
      if (Array.isArray(target)) {
          return target.some(v => valueInList(v, values, item, options));
      }
      return valueInList(target, values, item, options);
  }
  function valueInList(target, values, item, options) {
      return values.some(v => valueMatches(target, v, item, options));
  }
  /**
   * Compare using a comparison operator.
   * Handles arrays by checking any element.
   */
  function compareAny(target, value, op, item, options) {
      if (!value)
          return false;
      if (Array.isArray(target)) {
          return target.some(v => compareValue(v, value, op, item, options));
      }
      return compareValue(target, value, op, item, options);
  }
  /**
   * Compare using a comparison operator.
   */
  function compareValue(target, value, op, item, options) {
      switch (op) {
          case CmpOp.Eq:
              return valueMatches(target, value, item, options);
          case CmpOp.Neq:
              return !valueMatches(target, value, item, options);
          case CmpOp.Gt:
          case CmpOp.Gte:
          case CmpOp.Lt:
          case CmpOp.Lte: {
              // Numeric comparison
              const left = typeof target === "number" ? target : null;
              const right = resolveNumber(value, item, options);
              if (left !== null && right !== null) {
                  switch (op) {
                      case CmpOp.Gt: return left > right;
                      case CmpOp.Gte: return left >= right;
                      case CmpOp.Lt: return left < right;
                      case CmpOp.Lte: return left <= right;
                  }
              }
              return false;
          }
      }
  }
  // ============================================================================
  // Value Matching
  // ============================================================================
  /**
   * Check if target matches a literal value.
   * Handles type coercion in non-strict mode.
   */
  function valueMatches(target, value, item, options) {
      switch (value.type) {
          case "Field": {
              // Compare to another field's value
              const other = getPath(item, value.value);
              return other !== undefined && compareJsonValues(target, other, options);
          }
          case "Str": {
              if (typeof target === "string") {
                  return options.caseSensitive
                      ? target === value.value
                      : target.toLowerCase() === value.value.toLowerCase();
              }
              // Non-strict: parse string as number
              if (!options.strict && typeof target === "number") {
                  const parsed = parseFloat(value.value);
                  return !isNaN(parsed) && parsed === target;
              }
              return false;
          }
          case "Num": {
              if (typeof target === "number") {
                  return target === value.value;
              }
              // Non-strict: parse target as number
              if (!options.strict && typeof target === "string") {
                  const parsed = parseFloat(target);
                  return !isNaN(parsed) && parsed === value.value;
              }
              return false;
          }
          case "Bool": {
              return typeof target === "boolean" && target === value.value;
          }
          case "Null": {
              return target === null;
          }
      }
      return false;
  }
  /**
   * Resolve a number literal or field reference.
   */
  function resolveNumber(value, item, options) {
      switch (value.type) {
          case "Num":
              return value.value;
          case "Field": {
              const v = getPath(item, value.value);
              if (typeof v === "number")
                  return v;
              if (!options.strict && typeof v === "string") {
                  const parsed = parseFloat(v);
                  return isNaN(parsed) ? null : parsed;
              }
              return null;
          }
          default:
              return null;
      }
  }
  /**
   * Compare two JSON values for equality.
   */
  function compareJsonValues(a, b, options) {
      // String comparison
      if (typeof a === "string" && typeof b === "string") {
          return options.caseSensitive ? a === b : a.toLowerCase() === b.toLowerCase();
      }
      // Number comparison
      if (typeof a === "number" && typeof b === "number") {
          return a === b;
      }
      // Boolean comparison
      if (typeof a === "boolean" && typeof b === "boolean") {
          return a === b;
      }
      // Null comparison
      if (a === null && b === null) {
          return true;
      }
      // Non-strict type coercion
      if (!options.strict) {
          if (typeof a === "string" && typeof b === "number") {
              const parsed = parseFloat(a);
              return !isNaN(parsed) && parsed === b;
          }
          if (typeof a === "number" && typeof b === "string") {
              const parsed = parseFloat(b);
              return !isNaN(parsed) && parsed === a;
          }
      }
      return false;
  }
  // ============================================================================
  // Pattern Matching
  // ============================================================================
  /**
   * BETWEEN operator - check if value is in range [min, max].
   */
  function betweenMatch(target, values, item, options) {
      if (values.length !== 2)
          return false;
      const low = resolveNumber(values[0], item, options);
      const high = resolveNumber(values[1], item, options);
      if (low === null || high === null)
          return false;
      // Single number
      if (typeof target === "number") {
          return target >= low && target <= high;
      }
      // Array: any element in range
      if (Array.isArray(target)) {
          return target.some(v => betweenMatch(v, values, item, options));
      }
      return false;
  }
  /**
   * CONTAINS operator - check if string contains substring.
   */
  function containsMatch(target, value, item, options) {
      if (!value || value.type !== "Str")
          return false;
      if (typeof target === "string") {
          return options.caseSensitive
              ? target.includes(value.value)
              : target.toLowerCase().includes(value.value.toLowerCase());
      }
      // Array: any element contains
      if (Array.isArray(target)) {
          return target.some(v => valueMatches(v, value, item, options));
      }
      return false;
  }
  /**
   * FUZZY operator - fuzzy string matching.
   */
  function fuzzyMatch(target, value, item, options) {
      if (!value || value.type !== "Str")
          return false;
      if (typeof target === "string") {
          return fuzzyMatchText(target, value.value, options);
      }
      if (Array.isArray(target)) {
          return target.some(v => fuzzyMatch(v, value, item, options));
      }
      return false;
  }
  /**
   * STARTS WITH operator - check if string starts with prefix.
   */
  function startsWithMatch(target, value, caseSensitive) {
      if (!value || value.type !== "Str")
          return false;
      if (typeof target === "string") {
          return caseSensitive
              ? target.startsWith(value.value)
              : target.toLowerCase().startsWith(value.value.toLowerCase());
      }
      return false;
  }
  /**
   * ENDS WITH operator - check if string ends with suffix.
   */
  function endsWithMatch(target, value, caseSensitive) {
      if (!value || value.type !== "Str")
          return false;
      if (typeof target === "string") {
          return caseSensitive
              ? target.endsWith(value.value)
              : target.toLowerCase().endsWith(value.value.toLowerCase());
      }
      return false;
  }
  /**
   * LIKE operator - SQL LIKE pattern matching.
   * % matches any characters
   * _ matches single character
   */
  function likeMatch(text, pattern, caseSensitive) {
      const t = caseSensitive ? text : text.toLowerCase();
      const p = caseSensitive ? pattern : pattern.toLowerCase();
      // Special cases
      if (p === "%")
          return true;
      if (p === text)
          return true;
      // Convert LIKE pattern to regex
      let regex = "^";
      for (const ch of p) {
          if (ch === "%") {
              regex += ".*";
          }
          else if (ch === "_") {
              regex += ".";
          }
          else {
              regex += escapeRegex(ch);
          }
      }
      regex += "$";
      try {
          return new RegExp(regex).test(t);
      }
      catch {
          return false;
      }
  }
  /**
   * Escape special regex characters.
   */
  function escapeRegex(s) {
      return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  // ============================================================================
  // Full-Text Search
  // ============================================================================
  /**
   * Full-text search - check if any field contains term.
   * Recursively searches objects, arrays, strings, numbers, booleans.
   */
  function containsText(value, term, options) {
      if (typeof value === "string") {
          return options.caseSensitive
              ? value.includes(term)
              : value.toLowerCase().includes(term.toLowerCase());
      }
      if (typeof value === "number") {
          const s = value.toString();
          return options.caseSensitive
              ? s.includes(term)
              : s.toLowerCase().includes(term.toLowerCase());
      }
      if (typeof value === "boolean") {
          const s = value.toString();
          return options.caseSensitive
              ? s.includes(term)
              : s.toLowerCase().includes(term.toLowerCase());
      }
      if (Array.isArray(value)) {
          return value.some(v => containsText(v, term, options));
      }
      if (value && typeof value === "object") {
          for (const v of Object.values(value)) {
              if (containsText(v, term, options))
                  return true;
          }
      }
      return false;
  }
  /**
   * Fuzzy text search - approximate string matching.
   * Uses Levenshtein distance for similarity.
   */
  function fuzzyContainsText(value, term, options) {
      if (typeof value === "string") {
          return fuzzyMatchText(value, term, options);
      }
      if (typeof value === "number") {
          return fuzzyMatchText(value.toString(), term, options);
      }
      if (typeof value === "boolean") {
          return fuzzyMatchText(value.toString(), term, options);
      }
      if (Array.isArray(value)) {
          return value.some(v => fuzzyContainsText(v, term, options));
      }
      if (value && typeof value === "object") {
          for (const v of Object.values(value)) {
              if (fuzzyContainsText(v, term, options))
                  return true;
          }
      }
      return false;
  }
  /**
   * Fuzzy match text - allows typos and small edits.
   */
  function fuzzyMatchText(text, term, options) {
      const normalized = options.caseSensitive ? term : term.toLowerCase();
      if (!normalized)
          return false;
      const normalizedText = options.caseSensitive ? text : text.toLowerCase();
      // Exact substring match
      if (normalizedText.includes(normalized))
          return true;
      // Token-based fuzzy matching
      const tokens = tokenizeText(normalizedText);
      for (const token of tokens) {
          if (fuzzyDistanceOk(normalized, token))
              return true;
      }
      return false;
  }
  /**
   * Tokenize text into words.
   */
  function tokenizeText(text) {
      return text.split(/[^a-zA-Z0-9]+/).filter(s => s.length > 0);
  }
  /**
   * Check if edit distance is acceptable.
   * Threshold increases with string length.
   */
  function fuzzyDistanceOk(a, b) {
      if (a.length < 3 || b.length < 3)
          return a === b;
      const maxDist = a.length <= 4 ? 1 : a.length <= 7 ? 2 : 3;
      return levenshtein(a, b) <= maxDist;
  }
  /**
   * Compute Levenshtein edit distance.
   */
  function levenshtein(a, b) {
      const m = a.length;
      const n = b.length;
      if (m === 0)
          return n;
      if (n === 0)
          return m;
      const dp = [];
      for (let i = 0; i <= m; i++) {
          dp[i] = [i];
      }
      for (let j = 0; j <= n; j++) {
          dp[0][j] = j;
      }
      for (let i = 1; i <= m; i++) {
          for (let j = 1; j <= n; j++) {
              if (a[i - 1] === b[j - 1]) {
                  dp[i][j] = dp[i - 1][j - 1];
              }
              else {
                  dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
              }
          }
      }
      return dp[m][n];
  }
  // ============================================================================
  // Sorting
  // ============================================================================
  /**
   * Compare two rows for ORDER BY.
   *
   * @param a - First row
   * @param b - Second row
   * @param orderBy - ORDER BY specifications
   * @param options - Evaluation options
   * @returns -1 if a < b, 1 if a > b, 0 if equal
   */
  function compareForSort(a, b, orderBy, options) {
      for (const order of orderBy) {
          let av = order.field.toUpperCase() === "SCORE" ? null : getPath(a, order.field);
          let bv = order.field.toUpperCase() === "SCORE" ? null : getPath(b, order.field);
          const nullsFirst = order.nullsFirst ?? false;
          let cmp = 0;
          // Handle undefined/null
          if (av === undefined)
              av = null;
          if (bv === undefined)
              bv = null;
          if (av === null && bv === null) {
              cmp = 0;
          }
          else if (av === null) {
              cmp = nullsFirst ? -1 : 1;
          }
          else if (bv === null) {
              cmp = nullsFirst ? 1 : -1;
          }
          else if (typeof av === "number" && typeof bv === "number") {
              cmp = av < bv ? -1 : av > bv ? 1 : 0;
          }
          else if (typeof av === "string" && typeof bv === "string") {
              const aStr = options.caseSensitive ? av : av.toLowerCase();
              const bStr = options.caseSensitive ? bv : bv.toLowerCase();
              cmp = aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
          }
          else if (typeof av === "boolean" && typeof bv === "boolean") {
              cmp = av === bv ? 0 : av ? -1 : 1;
          }
          else {
              // Fallback: JSON string comparison
              const aStr = JSON.stringify(av);
              const bStr = JSON.stringify(bv);
              cmp = aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
          }
          // Apply descending order
          if (order.desc)
              cmp = -cmp;
          if (cmp !== 0)
              return cmp;
      }
      return 0;
  }

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
              const value = getPath(data[i], field);
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
          const normalized = normalizeValue(value, this.caseSensitive);
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

  /**
   * JSON Search Engine - Caching and Metrics
   *
   * Provides caching for parsed queries and search results.
   * Also tracks performance metrics for optimization.
   *
   * Two-level caching:
   * 1. Query parse cache - parsed Query AST
   * 2. Result cache - matching row indices
   *
   * Metrics tracked:
   * - Query count and latency
   * - Cache hit/miss ratio
   * - p95 latency for adaptive caching
   *
   * @module cache
   */
  /** Default fields to index */
  const DEFAULT_INDEX_FIELDS$1 = ["category", "country", "active"];
  /** Default result cache capacity */
  const DEFAULT_RESULT_CACHE_CAP$1 = 128;
  /** Minimum hits before caching result */
  const DEFAULT_RESULT_CACHE_MIN_HITS$1 = 2;
  /** Maximum rows to process */
  const MAX_RESULT_ROWS$1 = 1_000_000;
  // ============================================================================
  // Result Cache
  // ============================================================================
  /**
   * Result cache - stores matching row indices.
   *
   * Uses LRU eviction when full.
   * Only caches results after threshold hits for adaptive behavior.
   *
   * @example
   * ```typescript
   * const cache = new ResultCache(128, 2);
   *
   * // Cache hit
   * const rows = cache.get("country = 'USA'");
   *
   * // Record match
   * cache.record("country = 'USA'", [0, 5, 10]);
   * ```
   */
  class ResultCache {
      map = new Map();
      order = [];
      cap = DEFAULT_RESULT_CACHE_CAP$1;
      minHits = DEFAULT_RESULT_CACHE_MIN_HITS$1;
      hitsServed = 0;
      misses = 0;
      constructor(cap = DEFAULT_RESULT_CACHE_CAP$1, minHits = DEFAULT_RESULT_CACHE_MIN_HITS$1) {
          this.cap = cap;
          this.minHits = minHits;
      }
      /** Set cache capacity */
      setCap(cap) {
          this.cap = Math.max(1, cap);
          while (this.order.length > this.cap) {
              const old = this.order.shift();
              if (old)
                  this.map.delete(old);
          }
      }
      /** Set minimum hits threshold */
      setMinHits(minHits) {
          this.minHits = Math.max(1, minHits);
      }
      /**
       * Get cached result.
       * Returns null if not cached.
       * Updates LRU order on hit.
       */
      get(key) {
          const entry = this.map.get(key);
          if (entry?.data) {
              this.hitsServed++;
              const pos = this.order.indexOf(key);
              if (pos !== -1) {
                  this.order.splice(pos, 1);
                  this.order.push(key);
              }
              return [...entry.data];
          }
          this.misses++;
          return null;
      }
      /**
       * Record a search result.
       * Only caches if hit threshold reached.
       */
      record(key, data) {
          const entry = this.map.get(key);
          if (entry) {
              entry.hits++;
              if (entry.data) {
                  // Already cached, update LRU
                  const pos = this.order.indexOf(key);
                  if (pos !== -1) {
                      this.order.splice(pos, 1);
                      this.order.push(key);
                  }
                  return;
              }
              // Threshold reached, cache it
              if (entry.hits >= this.minHits) {
                  entry.data = [...data];
                  this.order.push(key);
                  while (this.order.length > this.cap) {
                      const old = this.order.shift();
                      if (old) {
                          const e = this.map.get(old);
                          if (e)
                              e.data = null;
                      }
                  }
              }
          }
          else {
              this.map.set(key, { hits: 1, data: null });
              this.order.push(key);
          }
      }
      /** Get cache statistics */
      stats() {
          return {
              hits: this.hitsServed,
              misses: this.misses,
              entries: this.order.length,
              cap: this.cap,
          };
      }
  }
  // ============================================================================
  // Query Parse Cache
  // ============================================================================
  /**
   * Query parse cache - stores parsed Query AST.
   * Avoids re-parsing the same query.
   */
  class QueryCache {
      map = new Map();
      order = [];
      cap = 512;
      setCap(cap) {
          this.cap = Math.max(1, cap);
          while (this.order.length > this.cap) {
              const old = this.order.shift();
              if (old)
                  this.map.delete(old);
          }
      }
      /** Get cached parsed query */
      get(key) {
          const q = this.map.get(key);
          if (q) {
              const pos = this.order.indexOf(key);
              if (pos !== -1) {
                  this.order.splice(pos, 1);
                  this.order.push(key);
              }
              return q;
          }
          return null;
      }
      /** Cache a parsed query */
      put(key, value) {
          if (this.map.has(key)) {
              const pos = this.order.indexOf(key);
              if (pos !== -1) {
                  this.order.splice(pos, 1);
              }
              this.order.push(key);
              this.map.set(key, value);
              return;
          }
          this.map.set(key, value);
          this.order.push(key);
          while (this.order.length > this.cap) {
              const old = this.order.shift();
              if (old)
                  this.map.delete(old);
          }
      }
  }
  // ============================================================================
  // Engine Metrics
  // ============================================================================
  /**
   * Engine metrics - tracks performance.
   *
   * Metrics collected:
   * - Total queries run
   * - Average latency
   * - p95 latency (for adaptive caching)
   * - Rows scanned
   * - Cache hit rate
   */
  class EngineMetrics {
      queryCount = 0;
      totalMs = 0;
      latencySamples = [];
      rowsScanned = 0;
      cacheHits = 0;
      cacheMisses = 0;
      /**
       * Record a query execution.
       */
      record(elapsedMs, scanned, cacheHit) {
          this.queryCount++;
          this.totalMs += elapsedMs;
          this.rowsScanned += scanned;
          if (cacheHit) {
              this.cacheHits++;
          }
          else {
              this.cacheMisses++;
          }
          this.latencySamples.push(elapsedMs);
          if (this.latencySamples.length > 200) {
              this.latencySamples.shift();
          }
      }
      /** Average query latency */
      avgLatency() {
          if (this.queryCount === 0)
              return 0;
          return this.totalMs / this.queryCount;
      }
      /** 95th percentile latency */
      p95Latency() {
          if (this.latencySamples.length === 0)
              return 0;
          const sorted = [...this.latencySamples].sort((a, b) => a - b);
          const idx = Math.ceil(sorted.length * 0.95) - 1;
          return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
      }
      /** Get metrics snapshot */
      snapshot() {
          const totalCache = this.cacheHits + this.cacheMisses;
          return {
              queryCount: this.queryCount,
              avgLatencyMs: this.avgLatency(),
              p95LatencyMs: this.p95Latency(),
              rowsScanned: this.rowsScanned,
              cacheHitRate: totalCache === 0 ? 0 : this.cacheHits / totalCache,
          };
      }
  }
  // ============================================================================
  // Global Query Cache
  // ============================================================================
  /** Global query parse cache (shared across engines) */
  const globalQueryCache = new QueryCache();
  /**
   * Set global query cache size.
   */
  function setQueryCacheSize(cap) {
      globalQueryCache.setCap(cap);
  }
  /**
   * Parse query with caching.
   * Checks cache first, parses if needed.
   */
  function parseQueryCached(query) {
      const key = normalizeQueryKey(query);
      const cached = globalQueryCache.get(key);
      if (cached)
          return cached;
      const parsed = parseQuery(key);
      globalQueryCache.put(key, parsed);
      return parsed;
  }
  // ============================================================================
  // Helpers
  // ============================================================================
  /**
   * Normalize query string for cache key.
   * Collapses whitespace, preserves quoted strings.
   */
  function normalizeQueryKey(query) {
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
          if (ch === " " || ch === "\t") {
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
   * JSON Search Engine - Aggregations
   *
   * Provides aggregation functions: SUM, AVG, MIN, MAX, COUNT, GROUP BY.
   *
   * Supported aggregations:
   * - COUNT(field) or COUNT(*) - Count rows/values
   * - SUM(field) - Sum of values
   * - AVG(field) - Average of values
   * - MIN(field) - Minimum value
   * - MAX(field) - Maximum value
   *
   * GROUP BY groups results by one or more fields.
   *
   * @module aggregates
   */
  /**
   * Aggregate data with optional filtering.
   *
   * @param data - Data rows
   * @param spec - Aggregation specification
   * @returns Aggregation results
   *
   * @example
   * ```typescript
   * // Count all
   * aggregateItems(data, { aggs: [{ op: "COUNT", field: "*" }] });
   *
   * // Sum by group
   * aggregateItems(data, { groupBy: ["country"], aggs: [{ op: "SUM", field: "price" }] });
   * ```
   */
  function aggregateItems(data, spec) {
      if (spec.filter) {
          const filtered = filterData(data, spec.filter);
          return aggregateIndices(data, filtered, spec);
      }
      const indices = range(data.length);
      return aggregateIndices(data, indices, spec);
  }
  /**
   * Aggregate specific indices.
   */
  function aggregateIndices(data, indices, spec) {
      // Distinct query
      if (spec.distinctFields && spec.distinctFields.length > 0 && !spec.groupBy?.length && spec.aggs.length === 0) {
          return distinctIndices(data, indices, spec.distinctFields);
      }
      // Group by processing
      const groups = new Map();
      const states = new Map();
      for (const idx of indices) {
          const item = data[idx];
          const keyParts = [];
          const groupObj = {};
          // Build group key from GROUP BY fields
          if (spec.groupBy) {
              for (const field of spec.groupBy) {
                  const v = getPath(item, field) ?? null;
                  keyParts.push(JSON.stringify(v));
                  groupObj[field] = v;
              }
          }
          const key = keyParts.join("|");
          if (!groups.has(key)) {
              groups.set(key, { keyParts, obj: groupObj });
              states.set(key, { count: 0, sum: 0, min: null, max: null });
          }
          const state = states.get(key);
          // Process each aggregation
          for (const agg of spec.aggs) {
              const op = agg.op.toUpperCase();
              switch (op) {
                  case "COUNT":
                      // COUNT(*) counts all rows
                      if (!agg.field || agg.field === "*") {
                          state.count++;
                      }
                      else if (getPath(item, agg.field)) {
                          state.count++;
                      }
                      break;
                  case "SUM":
                  case "AVG":
                  case "MIN":
                  case "MAX": {
                      const field = agg.field;
                      if (!field)
                          break;
                      const v = getPath(item, field);
                      if (typeof v === "number") {
                          state.sum += v;
                          state.min = state.min === null ? v : Math.min(state.min, v);
                          state.max = state.max === null ? v : Math.max(state.max, v);
                          state.count++;
                      }
                      break;
                  }
              }
          }
      }
      // Build result rows
      const results = [];
      for (const [_key, group] of groups) {
          const state = states.get(_key);
          const row = { ...group.obj };
          for (const agg of spec.aggs) {
              const op = agg.op.toUpperCase();
              const alias = agg.alias ?? `${op}_${agg.field ?? "*"}`;
              let value = null;
              switch (op) {
                  case "COUNT":
                      value = state.count;
                      break;
                  case "SUM":
                      value = state.sum;
                      break;
                  case "AVG":
                      value = state.count > 0 ? state.sum / state.count : null;
                      break;
                  case "MIN":
                      value = state.min;
                      break;
                  case "MAX":
                      value = state.max;
                      break;
              }
              row[alias] = value;
          }
          results.push(row);
      }
      return results;
  }
  // ============================================================================
  // Helpers
  // ============================================================================
  /**
   * Filter data using a query string.
   * Returns matching row indices.
   */
  function filterData(data, filter) {
      const query = parseQueryCached(filter);
      const options = { caseSensitive: query.caseSensitive, strict: query.strict };
      const indices = [];
      for (let i = 0; i < data.length; i++) {
          if (evalExpr(query.expr, data[i], options, i)) {
              indices.push(i);
          }
      }
      return indices;
  }
  /**
   * Get distinct rows based on fields.
   */
  function distinctIndices(data, indices, fields) {
      const seen = new Set();
      const results = [];
      for (const idx of indices) {
          const item = data[idx];
          const keyParts = [];
          const obj = {};
          for (const f of fields) {
              const v = getPath(item, f) ?? null;
              keyParts.push(JSON.stringify(v));
              obj[f] = v;
          }
          const key = keyParts.join("|");
          if (!seen.has(key)) {
              seen.add(key);
              results.push(obj);
          }
      }
      return results;
  }
  /**
   * Create range array [0, 1, 2, ..., n-1]
   */
  function range(n) {
      const arr = [];
      for (let i = 0; i < n; i++)
          arr.push(i);
      return arr;
  }
  /**
   * Count rows matching a filter.
   */
  function countAll(data, filter) {
      return filterData(data, filter).length;
  }

  /**
   * JSON Search Engine - SearchEngine Class
   *
   * Main SearchEngine class that ties everything together.
   *
   * Features:
   * - Field indexing for fast lookups
   * - Result caching with adaptive thresholds
   * - Metrics tracking
   * - Pagination support
   * - Aggregations
   *
   * @module engine-class
   */
  /** Default fields to index */
  const DEFAULT_INDEX_FIELDS = ["category", "country", "active"];
  /** Default result cache capacity */
  const DEFAULT_RESULT_CACHE_CAP = 128;
  /** Minimum hits before caching result */
  const DEFAULT_RESULT_CACHE_MIN_HITS = 2;
  /** Maximum rows to process */
  const MAX_RESULT_ROWS = 1_000_000;
  /** Next engine ID */
  let nextEngineId = 1;
  /** Registry of active engines */
  const engines = new Map();
  /**
   * Main SearchEngine class.
   *
   * Provides high-level API for searching JSON data.
   * Handles caching, indexing, and metrics internally.
   *
   * @example
   * ```typescript
   * const engine = new SearchEngine(data);
   *
   * // Simple search
   * const results = engine.search('country = "USA"');
   *
   * // Paged search
   * const paged = engine.searchPaged('category = "software" LIMIT 10 OFFSET 20');
   *
   * // Aggregations
   * const stats = engine.aggregate({ groupBy: ['country'], aggs: [{ op: 'COUNT', field: '*' }] });
   * ```
   */
  class SearchEngine {
      /** Unique engine ID */
      id;
      /** Data rows */
      data = [];
      /** Field indexes */
      indexes = new IndexSet();
      /** Indexed field names */
      indexFields = [];
      /** Result cache */
      resultCache = new ResultCache(DEFAULT_RESULT_CACHE_CAP, DEFAULT_RESULT_CACHE_MIN_HITS);
      /** Performance metrics */
      metrics = new EngineMetrics();
      /** Approximate memory usage */
      approxBytes = 0;
      /**
       * Create a new SearchEngine.
       *
       * @param data - Array of JSON objects to search
       * @param options - Engine configuration
       */
      constructor(data, options = {}) {
          this.id = nextEngineId++;
          this.setData(data, options);
      }
      /**
       * Set or update data.
       * Rebuilds indexes and clears cache.
       */
      setData(data, options = {}) {
          this.data = data;
          if (options.queryCacheCap) {
              setQueryCacheSize(options.queryCacheCap);
          }
          // Build indexes
          const indexFields = options.indexes?.length ? options.indexes : DEFAULT_INDEX_FIELDS;
          this.indexFields = indexFields;
          this.indexes.buildAll(data, indexFields);
          // Calculate memory
          this.approxBytes = JSON.stringify(data).length;
          // Reset cache and metrics
          this.resultCache = new ResultCache(DEFAULT_RESULT_CACHE_CAP, DEFAULT_RESULT_CACHE_MIN_HITS);
          this.metrics = new EngineMetrics();
      }
      /**
       * Execute a search query.
       *
       * @param query - Query string
       * @returns SearchResult with matching rows
       */
      search(query) {
          const started = performance.now();
          const parsed = parseQueryCached(query);
          const options = {
              caseSensitive: parsed.caseSensitive,
              strict: parsed.strict,
          };
          // Check result cache
          const cached = this.resultCache.get(query);
          let indices;
          if (cached) {
              indices = cached;
              this.metrics.record(0, 0, true);
          }
          else {
              // Execute search
              indices = this.executeSearchIndices(parsed, options);
              this.resultCache.record(query, indices);
              const elapsed = performance.now() - started;
              this.metrics.record(elapsed, indices.length, false);
              // Adaptive caching based on latency
              if (this.metrics.p95Latency() > 50) {
                  this.resultCache.setMinHits(1);
              }
              else {
                  this.resultCache.setMinHits(DEFAULT_RESULT_CACHE_MIN_HITS);
              }
          }
          // Map indices to rows
          const rows = indices.map(i => this.data[i]);
          return { data: rows, total: indices.length };
      }
      /**
       * Execute a paged search.
       *
       * @param query - Query string with LIMIT/OFFSET
       * @returns PagedResult with rows and total count
       */
      searchPaged(query) {
          const parsed = parseQueryCached(query);
          const options = {
              caseSensitive: parsed.caseSensitive,
              strict: parsed.strict,
          };
          // Create cache key without pagination for caching
          let cacheKey = query.toUpperCase().replace(/LIMIT\s+\d+\s*\d*/i, "").trim();
          if (!parsed.orderBy.length) {
              cacheKey = query;
          }
          const cached = this.resultCache.get(cacheKey);
          let indices;
          if (cached) {
              indices = cached;
              this.metrics.record(0, 0, true);
          }
          else {
              indices = this.executeSearchIndices(parsed, options);
              if (cacheKey) {
                  this.resultCache.record(cacheKey, indices);
              }
          }
          // Apply pagination
          const offset = parsed.offset ?? 0;
          const limit = parsed.limit ?? MAX_RESULT_ROWS;
          const paged = indices.slice(offset, offset + limit);
          const rows = paged.map(i => this.data[i]);
          return { totalMatches: indices.length, rows };
      }
      /**
       * Execute search and return row indices.
       * Applies sorting if ORDER BY specified.
       */
      executeSearchIndices(query, options) {
          const indices = [];
          for (let i = 0; i < this.data.length; i++) {
              if (evalExpr(query.expr, this.data[i], options, i)) {
                  indices.push(i);
              }
          }
          // Apply sorting
          if (query.orderBy.length > 0) {
              const hits = indices.map(idx => ({
                  idx,
                  item: this.data[idx],
              }));
              hits.sort((a, b) => compareForSort(a.item, b.item, query.orderBy, options));
              const offset = query.offset ?? 0;
              const limit = query.limit ?? MAX_RESULT_ROWS;
              return hits.slice(offset, offset + limit).map(h => h.idx);
          }
          return indices;
      }
      /**
       * Run aggregations on data.
       *
       * @param spec - Aggregation specification
       * @returns Aggregation results
       */
      aggregate(spec) {
          return aggregateItems(this.data, spec);
      }
      /**
       * Validate a query string.
       *
       * @param query - Query string
       * @returns Validation result
       */
      validate(query) {
          return validateQuery(query);
      }
      /**
       * Get result cache statistics.
       */
      getCacheStats() {
          return this.resultCache.stats();
      }
      /**
       * Get performance metrics.
       */
      getMetrics() {
          return this.metrics.snapshot();
      }
      /**
       * Get data size information.
       */
      getDataSize() {
          return {
              rowCount: this.data.length,
              approxBytes: this.approxBytes,
          };
      }
      /**
       * Get index statistics.
       */
      getIndexes() {
          return this.indexes.list();
      }
      /**
       * Create index for a field.
       */
      createIndex(field) {
          this.indexes.create(field, this.data);
          if (!this.indexFields.includes(field)) {
              this.indexFields.push(field);
          }
      }
      /**
       * Drop index for a field.
       */
      dropIndex(field) {
          this.indexes.drop(field);
          this.indexFields = this.indexFields.filter(f => f !== field);
      }
      /**
       * Update engine data.
       */
      update(data) {
          this.setData(data, { indexes: this.indexFields });
      }
      // ============================================================================
      // Static Methods
      // ============================================================================
      /**
       * Static: Search data without creating engine.
       */
      static searchJson(items, query) {
          const engine = new SearchEngine(items);
          return engine.search(query).data;
      }
      /**
       * Static: Paged search without creating engine.
       */
      static searchJsonPaged(items, query) {
          const engine = new SearchEngine(items);
          return engine.searchPaged(query);
      }
      /**
       * Static: Validate query without engine.
       */
      static validate(query) {
          return validateQuery(query);
      }
  }
  // ============================================================================
  // Factory Functions
  // ============================================================================
  /**
   * Create a new SearchEngine.
   *
   * @param json - JSON data or string
   * @param options - Engine options
   * @returns Configured SearchEngine
   */
  function initEngine(json, options = {}) {
      const data = typeof json === "string" ? JSON.parse(json) : json;
      return new SearchEngine(data, options);
  }
  /**
   * Quick search function.
   * Creates temporary engine.
   */
  function searchJson(items, query) {
      return SearchEngine.searchJson(items, query);
  }
  /**
   * Quick paged search function.
   */
  function searchJsonPaged(items, query) {
      return SearchEngine.searchJsonPaged(items, query);
  }
  /**
   * Quick validation function.
   */
  function validate(query) {
      return validateQuery(query);
  }
  /**
   * Set global query cache size.
   */
  function setCacheSize(cap) {
      setQueryCacheSize(cap);
  }

  const VERSION = "1.0.0";

  exports.EngineMetrics = EngineMetrics;
  exports.FieldIndex = FieldIndex;
  exports.IndexSet = IndexSet;
  exports.Lexer = Lexer;
  exports.Parser = Parser;
  exports.QueryParseError = QueryParseError;
  exports.ResultCache = ResultCache;
  exports.SearchEngine = SearchEngine;
  exports.VERSION = VERSION;
  exports.aggregateIndices = aggregateIndices;
  exports.aggregateItems = aggregateItems;
  exports.cloneJson = cloneJson;
  exports.collectIndexFilters = collectIndexFilters;
  exports.compareForSort = compareForSort;
  exports.countAll = countAll;
  exports.evalExpr = evalExpr;
  exports.evalPredicate = evalPredicate;
  exports.getPath = getPath;
  exports.initEngine = initEngine;
  exports.isArray = isArray;
  exports.isObject = isObject;
  exports.isValidFieldName = isValidFieldName;
  exports.normalizeString = normalizeString;
  exports.normalizeValue = normalizeValue;
  exports.parseQuery = parseQuery;
  exports.parseQueryCached = parseQueryCached;
  exports.searchJson = searchJson;
  exports.searchJsonPaged = searchJsonPaged;
  exports.setCacheSize = setCacheSize;
  exports.setPath = setPath;
  exports.setQueryCacheSize = setQueryCacheSize;
  exports.stringifyKey = stringifyKey;
  exports.useIndexes = useIndexes;
  exports.validate = validate;
  exports.validateQuery = validateQuery;
  exports.validateRegexPattern = validateRegexPattern;

  return exports;

})({});
//# sourceMappingURL=json-search-engine.js.map
