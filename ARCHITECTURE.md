# JSON Search Engine Architecture

A pure JavaScript/TypeScript search engine for JSON arrays with SQL-like query language.

## Smart Search Mode

The engine implements intelligent query detection that automatically distinguishes between full-text search and SQL-like field queries without requiring explicit prefixes.

### Query Detection Logic

```
User Query: "enterprise cloud"
     │
     ▼
┌─────────────┐
│   Lexer     │ Tokenize: Ident, Ident, EOF
└─────────────┘
     │
     ▼
┌─────────────┐
│   Parser    │
│             │
│ If (Ident followed by Ident/EOF)  → FULL-TEXT mode
│    └─→ Combine as AND expression
│
│ If (Ident followed by Operator)   → SQL-LIKE mode  
│    └─→ Parse as field predicate
│
│ If (starts with Operator)        → NUMERIC mode
│    └─→ Create NumericTerm
└─────────────┘
```

### Query Type Examples

| Input | Tokens | Parser Mode | Behavior |
|-------|--------|-------------|----------|
| `enterprise` | Ident, EOF | Full-text | Search all string fields |
| `enterprise cloud` | Ident, Ident, EOF | Full-text | AND both terms |
| `enterprise AND cloud` | Ident, AND, Ident | Dumb Search | Explicit AND |
| `name = "USA"` | Ident, Eq, String | SQL-like | Field comparison |
| `> 350` | Gt, Number | Numeric | Compare all number fields |
| `350` | Number, EOF | Full-text | Find number anywhere |

### Expression Types (AST)

```typescript
type Expr =
  | { type: "Term"; value: string }        // Full-text search
  | { type: "FuzzyTerm"; value: string } // Fuzzy matching
  | { type: "NumericTerm"; value: string; op: string } // Numeric comparison
  | { type: "Predicate"; pred: Predicate } // Field comparison
  | { type: "And"; parts: Expr[] }     // Boolean AND
  | { type: "Or"; parts: Expr[] }    // Boolean OR
  | { type: "All" };                // Match all
```

## Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        USER API                            │
│  searchJson() | initEngine() | searchJsonPaged() | validate│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    SearchEngine                           │
│  - Query parse cache (512 entries)                        │
│  - Result cache (128 entries, adaptive threshold)          │
│  - Field indexes (inverted)                               │
│  - Metrics tracking                                       │
└─────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Parser        │  │   Indexes       │  │   Cache         │
│   (750+ lines) │  │   (280+ lines) │  │   (300+ lines)  │
│                 │  │                 │  │                 │
│  Query Parser  │  │ FieldIndex     │  │ ResultCache    │
│  - Full-text   │  │ InvertedIndex │  │ QueryCache     │
│  - SQL-like    │  │ - IndexSet    │  │ EngineMetrics │
│  - Smart Mode │  │ - Smart lookup│  │ - Adaptive     │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Evaluator (Engine)                  │
│   (670+ lines)                                        │
│                                                    │
│  - Expression eval (Term, Fuzzy, Numeric, Predicate) │
│  - Full-text matching                              │
│  - Numeric comparison > >= < <=                   │
│  - Predicate eval (=, !=, IN, LIKE, CONTAINS)      │
│  - Sort comparison                                │
│  - Path resolution (dotted notation)              │
└─────────────────────────────────────────────────────────────┘
```

## Module Design

### 1. types.ts (205 lines)

Core type definitions and token kinds.

```typescript
// JsonValue type
type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

// Token kinds for lexer/parser
enum TokenKind {
  Select, Where, And, Or, Not, Fuzzy, In, Like, Regex,
  Order, By, Limit, Offset, Asc, Desc,
  Between, Contains, Starts, Ends, Exists, Is,
  Eq, Neq, Gt, Gte, Lt, Lte,
  LParen, RParen, Comma, Ident, String, Number, Bool, Null
}

// Query AST nodes
class Expr { ... }
class Predicate { ... }
class Query { ... }
```

### 2. lexer.ts (218 lines)

Tokenizes query strings into tokens.

**Responsibilities:**
- Parse strings, numbers, identifiers
- Recognize keywords (AND, OR, LIKE, etc.)
- Track position for error reporting

**Public API:**
```typescript
function tokenize(query: string): Token[]
```

### 3. parser.ts (541 lines)

Builds AST from tokens.

**Responsibilities:**
- Parse SELECT, WHERE, ORDER BY, LIMIT, OFFSET clauses
- Build Predicate tree with AND/OR/NOT operators
- Support all query operators (=, !=, >, >=, <, <=, LIKE, IN, BETWEEN, etc.)

**Public API:**
```typescript
function parseQuery(query: string): Query
function validateQuery(query: string): ValidationResult
```

### 4. engine.ts (485 lines)

Evaluates queries against data.

**Responsibilities:**
- Evaluate expressions (field references, literals)
- Evaluate predicates (comparison operators)
- Handle dotted paths (meta.region)
- Sort results
- Limit/offset results

**Key Functions:**
```typescript
function evalExpr(expr: Expr, row: JsonValue, ctx: EvalContext): JsonValue
function evalPredicate(pred: Predicate, row: JsonValue, ctx: EvalContext): boolean
function compareForSort(a: JsonValue, b: JsonValue, ord: OrderSpec): number
```

### 5. utils.ts (71 lines)

Utility functions.

**Key Functions:**
```typescript
function getPath(obj: JsonValue, path: string): JsonValue       // Get nested value
function setPath(obj: JsonValue, path: string, val): void // Set nested value
function cloneJson(val: JsonValue): JsonValue               // Deep clone
function isSubset(a: JsonValue, b: JsonValue): boolean     // Object subset check
```

### 6. indexes.ts (211 lines)

Field indexing for faster searches.

**Responsibilities:**
- Create inverted indexes for indexed fields
- Quick lookup by exact value or ranges

**Key Classes:**
```typescript
class FieldIndex {
  build(values: JsonValue[]): void              // Build index
  get(value: JsonValue): number[]              // Lookup by value
  getRange(min, max): number[]                // Range query
}

class IndexSet {
  create(field: string, data: JsonValue[]): void
  query(field: string, value: JsonValue): number[]
}
```

### 7. cache.ts (226 lines)

Query parsing and result caching.

**Key Classes:**
```typescript
class ResultCache {
  get(query: string): number[] | null        // Get cached result
  record(query: string, indices: number[]): void  // Cache result
}

class EngineMetrics {
  record(latency: number, rowCount: number, cached: boolean): void
  snapshot(): EngineMetricsSnapshot
}
```

### 8. aggregates.ts (171 lines)

Aggregation functions.

**Supported Aggregations:**
- SUM, AVG, MIN, MAX, COUNT, GROUP BY

**Key Functions:**
```typescript
function aggregateItems(data: JsonValue[], spec: AggSpec): JsonValue[]
```

### 9. engine-class.ts (221 lines)

Main SearchEngine class.

**Public API:**
```typescript
class SearchEngine {
  constructor(data: JsonValue[], options?: EngineOptions)
  search(query: string): SearchResult
  searchPaged(query: string): PagedResult
  aggregate(spec: AggSpec): JsonValue[]
  validate(query: string): ValidationResult
  getCacheStats(): CacheStats
  getMetrics(): EngineMetricsSnapshot
  createIndex(field: string): void
  dropIndex(field: string): void
}

function initEngine(data: JsonValue[], options?: EngineOptions): SearchEngine
function searchJson(items: JsonValue[], query: string): JsonValue[]
```

### 10. index.ts (11 lines)

Public exports.

```typescript
export * from "./types.js";
export * from "./lexer.js";
export * from "./parser.js";
export * from "./engine.js";
// ... all modules
export { SearchEngine, initEngine, searchJson, searchJsonPaged, validate } from "./engine-class.js";
export const VERSION = "1.0.0";
```

## Query Flow

```
User Query
    │
    ▼
┌─────────────┐
│  Lexer      │  Tokenize query string
└─────────────┘
    │ Token[]
    ▼
┌─────────────┐
│  Parser     │  Build Query AST
└─────────────┘
    │ Query
    ▼
┌─────────────┐
│  Cache      │  Check if parsed
└─────────────┘
    │ Parsed Query
    ▼
┌─────────────┐
│  Engine     │  Evaluate against data
└─────────────┘
    │ Indices
    ▼
┌─────────────┐
│  Index      │  Optional: use field index
└─────────────┘
    │ Indices
    ▼
┌─────────────┐
│  Result     │  Map indices to rows
└─────────────┘
    │ SearchResult { data, total }
```

## Performance Features

### 1. Query Caching
- Parse once, execute many times
- Key: query string hash

### 2. Result Caching
- Cache matching row indices
- Adaptive hit threshold (p95 latency based)

### 3. Field Indexing
- Inverted indexes for common fields
- Default indexed: category, country, active

### 4. Metrics Tracking
- Query latency tracking
- Cache hit/miss ratio
- Adaptive caching strategy

## Build Outputs

```
dist/
├── esm/index.js           # ES Modules (for bundlers)
├── cjs/index.js          # CommonJS (Node.js)
├── types/                 # TypeScript declarations
│   └── index.d.ts
└── iife/                 # Browser bundles
    ├── json-search-engine.js      # 72KB
    └── json-search-engine.min.js # 30KB
```

## Dependencies

None - pure TypeScript implementation.

## Browser Support

- Chrome, Firefox, Safari, Edge
- Salesforce LWC
- Any browser with ES5+ support