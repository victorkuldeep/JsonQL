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

import { JsonValue, Expr, Op, Predicate, Query, ValueLit, EvalOptions, OrderBy, IndexHit } from "./types.js";
import { getPath } from "./utils.js";

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
export function evalExpr(
  expr: Expr,
  item: JsonValue,
  options: EvalOptions,
  idx: number
): boolean {
  switch (expr.type) {
    case "Or":
      return expr.parts.some(p => evalExpr(p, item, options, idx));
    case "And":
      return expr.parts.every(p => evalExpr(p, item, options, idx));
    case "Not":
      return !evalExpr(expr.inner, item, options, idx);
    case "Term":
      return containsText(item, expr.value, options);
    case "StartsWith":
      return startsWithText(item, expr.value, options.caseSensitive);
    case "EndsWith":
      return endsWithText(item, expr.value, options.caseSensitive);
    case "Contains":
      return containsText(item, expr.value, options);
    case "FuzzyTerm":
      return fuzzyContainsText(item, expr.value, options);
    case "NumericTerm":
      return numericContainsText(item, expr.value, expr.op);
    case "Predicate":
      return evalPredicate(expr.pred, item, options, idx);
    case "All":
      return true;
  }
  return false;
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
export function evalPredicate(
  pred: Predicate,
  item: JsonValue,
  options: EvalOptions,
  idx: number
): boolean {
  // Get field value using dotted path (e.g., "meta.region")
  const target = getPath(item, pred.field);
  
  // Field doesn't exist
  if (!target) {
    return pred.op === Op.IsNull;
  }

  switch (pred.op) {
    // LIKE operator - pattern matching with % and _ wildcards
    case Op.Like:
      if (pred.values[0]?.type === "Str") {
        if (typeof target === "string") {
          return likeMatch(target, pred.values[0].value, options.caseSensitive);
        }
      }
      return false;
    case Op.NotLike:
      if (pred.values[0]?.type === "Str") {
        if (typeof target === "string") {
          return !likeMatch(target, pred.values[0].value, options.caseSensitive);
        }
      }
      return false;
    // REGEX operator - regular expression
    case Op.Regex:
      if (pred.values[0]?.type === "RegexCompiled") {
        if (typeof target === "string") {
          return pred.values[0].value.test(target);
        }
      }
      return false;
    case Op.NotRegex:
      if (pred.values[0]?.type === "RegexCompiled") {
        if (typeof target === "string") {
          return !pred.values[0].value.test(target);
        }
      }
      return false;
    // IN operator - membership in list
    case Op.In:
      return matchesIn(target, pred.values, item, options);
    case Op.NotIn:
      return !matchesIn(target, pred.values, item, options);
    // BETWEEN operator - numeric range
    case Op.Between:
      return betweenMatch(target, pred.values, item, options);
    // CONTAINS operator - substring
    case Op.Contains:
      return containsMatch(target, pred.values[0], item, options);
    // FUZZY operator - fuzzy string matching
    case Op.Fuzzy:
      return fuzzyMatch(target, pred.values[0], item, options);
    // STARTS WITH operator - prefix
    case Op.StartsWith:
      return startsWithMatch(target, pred.values[0], options.caseSensitive);
    // ENDS WITH operator - suffix
    case Op.EndsWith:
      return endsWithMatch(target, pred.values[0], options.caseSensitive);
    // EXISTS operator - field exists
    case Op.Exists:
      return true;
    // IS NULL - value is null
    case Op.IsNull:
      return target === null;
    // IS NOT NULL - value is not null
    case Op.IsNotNull:
      return target !== null;
    // Comparison operators: =, !=, >, >=, <, <=
    case Op.Eq:
      return compareAny(target, pred.values[0], CmpOp.Eq, item, options);
    case Op.Neq:
      return compareAny(target, pred.values[0], CmpOp.Neq, item, options);
    case Op.Gt:
      return compareAny(target, pred.values[0], CmpOp.Gt, item, options);
    case Op.Gte:
      return compareAny(target, pred.values[0], CmpOp.Gte, item, options);
    case Op.Lt:
      return compareAny(target, pred.values[0], CmpOp.Lt, item, options);
    case Op.Lte:
      return compareAny(target, pred.values[0], CmpOp.Lte, item, options);
    default:
      return false;
  }
}

// ============================================================================
// Comparison Operators
// ============================================================================

/** Internal comparison operation enum */
enum CmpOp {
  Eq,
  Neq,
  Gt,
  Gte,
  Lt,
  Lte,
}

/**
 * Check if value is in list (IN operator).
 * Handles both single values and arrays.
 */
function matchesIn(target: JsonValue, values: ValueLit[], item: JsonValue, options: EvalOptions): boolean {
  if (Array.isArray(target)) {
    return target.some(v => valueInList(v, values, item, options));
  }
  return valueInList(target, values, item, options);
}

function valueInList(target: JsonValue, values: ValueLit[], item: JsonValue, options: EvalOptions): boolean {
  return values.some(v => valueMatches(target, v, item, options));
}

/**
 * Compare using a comparison operator.
 * Handles arrays by checking any element.
 */
function compareAny(
  target: JsonValue,
  value: ValueLit | undefined,
  op: CmpOp,
  item: JsonValue,
  options: EvalOptions
): boolean {
  if (!value) return false;
  if (Array.isArray(target)) {
    return target.some(v => compareValue(v, value, op, item, options));
  }
  return compareValue(target, value, op, item, options);
}

/**
 * Compare using a comparison operator.
 */
function compareValue(
  target: JsonValue,
  value: ValueLit,
  op: CmpOp,
  item: JsonValue,
  options: EvalOptions
): boolean {
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
function valueMatches(target: JsonValue, value: ValueLit, item: JsonValue, options: EvalOptions): boolean {
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
function resolveNumber(value: ValueLit, item: JsonValue, options: EvalOptions): number | null {
  switch (value.type) {
    case "Num":
      return value.value;
    case "Field": {
      const v = getPath(item, value.value);
      if (typeof v === "number") return v;
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
function compareJsonValues(a: JsonValue, b: JsonValue, options: EvalOptions): boolean {
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
function betweenMatch(target: JsonValue, values: ValueLit[], item: JsonValue, options: EvalOptions): boolean {
  if (values.length !== 2) return false;
  const low = resolveNumber(values[0], item, options);
  const high = resolveNumber(values[1], item, options);
  if (low === null || high === null) return false;

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
function containsMatch(target: JsonValue, value: ValueLit | undefined, item: JsonValue, options: EvalOptions): boolean {
  if (!value || value.type !== "Str") return false;

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
function fuzzyMatch(target: JsonValue, value: ValueLit | undefined, item: JsonValue, options: EvalOptions): boolean {
  if (!value || value.type !== "Str") return false;

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
function startsWithMatch(target: JsonValue, value: ValueLit | undefined, caseSensitive: boolean): boolean {
  if (!value || value.type !== "Str") return false;

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
function endsWithMatch(target: JsonValue, value: ValueLit | undefined, caseSensitive: boolean): boolean {
  if (!value || value.type !== "Str") return false;

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
function likeMatch(text: string, pattern: string, caseSensitive: boolean): boolean {
  const t = caseSensitive ? text : text.toLowerCase();
  const p = caseSensitive ? pattern : pattern.toLowerCase();

  // Special cases
  if (p === "%") return true;
  if (p === text) return true;

  // Convert LIKE pattern to regex
  let regex = "^";
  for (const ch of p) {
    if (ch === "%") {
      regex += ".*";
    } else if (ch === "_") {
      regex += ".";
    } else {
      regex += escapeRegex(ch);
    }
  }
  regex += "$";

  try {
    return new RegExp(regex).test(t);
  } catch {
    return false;
  }
}

/**
 * Escape special regex characters.
 */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ============================================================================
// Full-Text Search
// ============================================================================

/**
 * Full-text search - check if any field contains term.
 * Recursively searches objects, arrays, strings, numbers, booleans.
 */
function containsText(value: JsonValue, term: string, options: EvalOptions): boolean {
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
      if (containsText(v as JsonValue, term, options)) return true;
    }
  }
  return false;
}

/**
 * Fuzzy text search - approximate string matching.
 * Uses Levenshtein distance for similarity.
 */
function fuzzyContainsText(value: JsonValue, term: string, options: EvalOptions): boolean {
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
      if (fuzzyContainsText(v as JsonValue, term, options)) return true;
    }
  }
  return false;
}

/**
 * Starts with text - prefix matching for wildcard searches (Prod*)
 */
function startsWithText(value: JsonValue, prefix: string, caseSensitive: boolean): boolean {
  const p = caseSensitive ? prefix : prefix.toLowerCase();
  
  if (typeof value === "string") {
    const v = caseSensitive ? value : value.toLowerCase();
    return v.startsWith(p);
  }
  if (typeof value === "number") {
    const s = value.toString();
    const n = caseSensitive ? s : s.toLowerCase();
    return n.startsWith(p);
  }
  if (typeof value === "boolean") {
    const s = value.toString();
    const n = caseSensitive ? s : s.toLowerCase();
    return n.startsWith(p);
  }
  if (Array.isArray(value)) {
    return value.some(v => startsWithText(v, prefix, caseSensitive));
  }
  if (value && typeof value === "object") {
    for (const v of Object.values(value)) {
      if (startsWithText(v as JsonValue, prefix, caseSensitive)) return true;
    }
  }
  return false;
}

/**
 * Ends with text - suffix matching for *suffix patterns (*dia)
 */
function endsWithText(value: JsonValue, suffix: string, caseSensitive: boolean): boolean {
  const s = caseSensitive ? suffix : suffix.toLowerCase();
  
  if (typeof value === "string") {
    const v = caseSensitive ? value : value.toLowerCase();
    return v.endsWith(s);
  }
  if (typeof value === "number") {
    const n = value.toString();
    const v = caseSensitive ? n : n.toLowerCase();
    return v.endsWith(s);
  }
  if (typeof value === "boolean") {
    const n = value.toString();
    const v = caseSensitive ? n : n.toLowerCase();
    return v.endsWith(s);
  }
  if (Array.isArray(value)) {
    return value.some(v => endsWithText(v, suffix, caseSensitive));
  }
  if (value && typeof value === "object") {
    for (const v of Object.values(value)) {
      if (endsWithText(v as JsonValue, suffix, caseSensitive)) return true;
    }
  }
  return false;
}

/**
 * Numeric comparison - check if ANY number field matches.
 * Handles >, >=, <, <= comparisons.
 */
function numericContainsText(value: JsonValue, numStr: string, op: string): boolean {
  const targetNum = parseFloat(numStr);
  if (isNaN(targetNum)) return false;
  
  if (typeof value === "number") {
    switch (op) {
      case ">": return value > targetNum;
      case ">=": return value >= targetNum;
      case "<": return value < targetNum;
      case "<=": return value <= targetNum;
    }
  }
  if (Array.isArray(value)) {
    return value.some(v => numericContainsText(v, numStr, op));
  }
  if (value && typeof value === "object") {
    for (const v of Object.values(value)) {
      if (numericContainsText(v as JsonValue, numStr, op)) return true;
    }
  }
  return false;
}

/**
 * Fuzzy match text - allows typos and small edits.
 */
function fuzzyMatchText(text: string, term: string, options: EvalOptions): boolean {
  const normalized = options.caseSensitive ? term : term.toLowerCase();
  if (!normalized) return false;

  const normalizedText = options.caseSensitive ? text : text.toLowerCase();
  
  // Exact substring match
  if (normalizedText.includes(normalized)) return true;

  // Token-based fuzzy matching
  const tokens = tokenizeText(normalizedText);
  for (const token of tokens) {
    if (fuzzyDistanceOk(normalized, token)) return true;
  }
  return false;
}

/**
 * Tokenize text into words.
 */
function tokenizeText(text: string): string[] {
  return text.split(/[^a-zA-Z0-9]+/).filter(s => s.length > 0);
}

/**
 * Check if edit distance is acceptable.
 * Threshold increases with string length.
 */
function fuzzyDistanceOk(a: string, b: string): boolean {
  if (a.length < 3 || b.length < 3) return a === b;
  const maxDist = a.length <= 4 ? 1 : a.length <= 7 ? 2 : 3;
  return levenshtein(a, b) <= maxDist;
}

/**
 * Compute Levenshtein edit distance.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = [];
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
      } else {
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
export function compareForSort(
  a: JsonValue,
  b: JsonValue,
  orderBy: OrderBy[],
  options: EvalOptions
): number {
  for (const order of orderBy) {
    let av = order.field.toUpperCase() === "SCORE" ? null : getPath(a, order.field);
    let bv = order.field.toUpperCase() === "SCORE" ? null : getPath(b, order.field);

    const nullsFirst = order.nullsFirst ?? false;
    let cmp = 0;

    // Handle undefined/null
    if (av === undefined) av = null;
    if (bv === undefined) bv = null;

    if (av === null && bv === null) {
      cmp = 0;
    } else if (av === null) {
      cmp = nullsFirst ? -1 : 1;
    } else if (bv === null) {
      cmp = nullsFirst ? 1 : -1;
    } else if (typeof av === "number" && typeof bv === "number") {
      cmp = av < bv ? -1 : av > bv ? 1 : 0;
    } else if (typeof av === "string" && typeof bv === "string") {
      const aStr = options.caseSensitive ? av : av.toLowerCase();
      const bStr = options.caseSensitive ? bv : bv.toLowerCase();
      cmp = aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
    } else if (typeof av === "boolean" && typeof bv === "boolean") {
      cmp = av === bv ? 0 : av ? -1 : 1;
    } else {
      // Fallback: JSON string comparison
      const aStr = JSON.stringify(av);
      const bStr = JSON.stringify(bv);
      cmp = aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
    }

    // Apply descending order
    if (order.desc) cmp = -cmp;
    if (cmp !== 0) return cmp;
  }
  return 0;
}