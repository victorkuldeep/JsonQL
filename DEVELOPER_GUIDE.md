# JsonQL Developer Guide

## Prerequisites

- Node.js 18+
- npm 9+

## Setup

```bash
# Clone the repository
git clone <repository-url>
cd JsonQL

# Install dependencies
npm install
```

## Development Commands

```bash
# Build all formats (ESM, CJS, Types)
npm run build

# Build browser bundles
npm run build:iife     # IIFE bundle
npm run build:min      # Minified IIFE (json-query-lite.min.js)

# Run Unit Tests (Vitest)
npm test              # Run all 46+ tests

# Run Release Validation Suite
node demo/release-suite.mjs # Validates 50+ library queries against 50k records
```

## Project Structure

```
JsonQL/
├── src/                # Core engine source
├── test/               # Unit tests (Vitest)
│   ├── index.test.ts   # Functional tests
│   ├── scoring.test.ts # BM25 validation
│   └── wildcard.test.ts# LIKE/CONTAINS tests
├── demo/               # Professional Dashboard
│   ├── dataset.json    # 50k sample records
│   ├── queries.json    # Searchable query library
│   └── release-suite.mjs # Integration test gate
├── dist/               # Build output
└── package.json
```

## Adding New Features

### 1. Update Types
In `src/types.ts`, update `TokenKind`, `Expr`, or `SearchResult` as needed.

### 2. Update Lexer/Parser
If adding syntax, update `lexer.ts` to recognize new characters and `parser.ts` to build the new AST nodes.

### 3. Implement in Engine
Update `engine.ts` to handle the new AST nodes during evaluation.

### 4. Verify with Gates
1. Add a unit test in `test/`.
2. Add an example query to `demo/queries.json`.
3. Run `node demo/release-suite.mjs` to ensure zero regressions.

## Query Syntax Examples

### Full-Text Relevance (BM25)
```sql
"enterprise grade" ORDER BY SCORE DESC
fiber OR switch ORDER BY SCORE DESC
```

### Advanced Filtering
```sql
country = "India" AND salary > 2000000
category IN ("software", "iot")
tags CONTAINS "fiber"
notes IS NOT NULL
```

### Array & Null Checks
```sql
tags = []               -- Find empty arrays
meta.region EXISTS      -- Check field presence
notes IS NULL           -- Match null values
```

### Projections & Sorting
```sql
SELECT name, country, SCORE ORDER BY country ASC, SCORE DESC
SELECT * LIMIT 10 OFFSET 20
```

## Building for Salesforce (LWC)

The IIFE bundle is designed specifically for LWC static resources.
1. Run `npm run build:min`.
2. Upload `dist/iife/jsonql.min.js` to Salesforce.
3. Import via `loadScript`.

## Code Style

- Use TypeScript strict mode.
- Run `npm run format` before committing.
- Ensure all logic is zero-dependency.
