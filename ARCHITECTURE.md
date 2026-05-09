# JsonQL Architecture

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
| `Prod*` | Ident(*), EOF | Wildcard | Starts with "Prod" |
| `*dia` | Ident(*), EOF | Wildcard | Ends with "dia" |
| `*do*` | Ident(*), EOF | Wildcard | Contains "do" |

### Expression Types (AST)

```typescript
type Expr =
  | { type: "Term"; value: string }        // Full-text search
  | { type: "StartsWith"; value: string } // Prefix wildcard (Prod*)
  | { type: "EndsWith"; value: string }   // Suffix wildcard (*dia)
  | { type: "Contains"; value: string }  // Contains wildcard (*do*)
  | { type: "FuzzyTerm"; value: string } // Fuzzy matching
  | { type: "NumericTerm"; value: string; op: string } // Numeric comparison
  | { type: "Predicate"; pred: Predicate } // Field comparison
  | { type: "And"; parts: Expr[] }     // Boolean AND
  | { type: "Or"; parts: Expr[] }    // Boolean OR
  | { type: "All" };                // Match all
```

## Relevance Scoring (BM25)

JsonQL implements the **BM25 (Best Matching 25)** algorithm for ranking results. This elevates the engine from simple boolean filtering to professional discovery.

### How it Works
1. **Term Frequency (TF):** Matches are weighted by how often terms appear in a document, with saturation.
2. **Inverse Document Frequency (IDF):** Rare terms are given more weight than common terms.
3. **Document Length Normalization:** Matches in shorter documents rank higher than matches in long ones.

### Dynamic Normalization (0-100%)
The engine calculates the `maxScore` for every query and scales all results relative to it. This provides a user-friendly "Match Percentage" that remains consistent regardless of dataset size (50k vs 1M records).

## Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        USER API                            │
│  search() | initEngine() | searchPaged() | aggregate()     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    SearchEngine                           │
│  - Query parse cache (512 entries)                        │
│  - Result cache (128 entries, adaptive threshold)          │
│  - Field indexes (inverted)                               │
│  - BM25 Corpus Stats (avgdl, docLengths)                  │
└─────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Parser        │  │   Indexes       │  │   Cache         │
│                 │  │                 │  │                 │
│  Query Parser  │  │ FieldIndex     │  │ ResultCache    │
│  - SQL-like    │  │ InvertedIndex │  │ QueryCache     │
│  - BM25 Detection│  │ - IndexSet    │  │ EngineMetrics │
│  - Multi-Sort  │  │ - Smart lookup│  │ - Adaptive     │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Evaluator (Engine)                  │
│                                                            │
│  - Two-Pass Scoring Pipeline                               │
│  - Pass 1: Filtering & TF/DF Collection                   │
│  - Pass 2: BM25 Score Calculation                         │
│  - Multi-Column SORT (including SCORE)                     │
└─────────────────────────────────────────────────────────────┘
```

## Module Design

### 1. types.ts
Core type definitions, token kinds, and result interfaces (SearchResult, PagedResult).

### 2. lexer.ts
Tokenizes query strings. Now supports array brackets `[]` and trailing modifiers.

### 3. parser.ts
Builds AST. Supports complex SQL-like syntax, multi-column `ORDER BY`, and automatic wildcard detection in predicates.

### 4. engine.ts
The "Virtual Machine" that evaluates queries. Implements the scoring logic and exhaustive term counting for relevance.

### 5. indexes.ts
Inverted indexes for O(1) equality lookups.

### 6. engine-class.ts
The high-level orchestrator. Manages the lifecycle of data, indexes, and the two-pass execution pipeline.

## Build Outputs

```
dist/
├── esm/index.js           # ES Modules (for bundlers)
├── cjs/index.js          # CommonJS (Node.js)
├── types/                 # TypeScript declarations
└── iife/                 # Browser bundles
    ├── jsonql.js         # Standard bundle
    └── jsonql.min.js     # Production minified
```

## Dependencies

None - pure TypeScript implementation.

## Browser Support

- Chrome, Firefox, Safari, Edge
- Salesforce LWC
- Any environment with ES6+ support
