# Project Overview: JsonQL (json-search-engine)

JsonQL is a pure JavaScript/TypeScript search engine designed for JSON arrays, featuring a SQL-like query language. It supports smart search (auto-detecting full-text vs. SQL-like queries), field indexing, result caching, and complex aggregations.

## Tech Stack
- **Language:** TypeScript
- **Testing:** Vitest
- **Build Tools:** TSC (ESM/CJS), Rollup (IIFE), Terser (Minification)
- **Linting/Formatting:** ESLint, Prettier

## Architecture
The engine follows a classic compiler-like structure:
1. **Lexer (`lexer.ts`):** Tokenizes query strings.
2. **Parser (`parser.ts`):** Builds an AST (Abstract Syntax Tree) with support for SELECT, WHERE, ORDER BY, LIMIT, and OFFSET.
3. **Engine (`engine.ts`):** Evaluates AST expressions and predicates against JSON data.
4. **Indexes (`indexes.ts`):** Manages inverted indexes for optimized field lookups.
5. **Cache (`cache.ts`):** Handles query parse caching and result caching with adaptive thresholds.
6. **Aggregates (`aggregates.ts`):** Implements SUM, AVG, MIN, MAX, COUNT, and GROUP BY logic.
7. **Engine Class (`engine-class.ts`):** Provides the high-level `SearchEngine` API.

## Building and Running

### Key Commands
- **Build everything:** `npm run build`
- **Build ESM:** `npm run build:esm`
- **Build CJS:** `npm run build:cjs`
- **Build Types:** `npm run build:types`
- **Build Browser Bundle:** `npm run build:iife` && `npm run build:min`
- **Run Tests:** `npm test`
- **Run Tests (Watch):** `npm run test:watch`
- **Lint:** `npm run lint`
- **Format:** `npm run format`

## Development Conventions

### Coding Style
- **TypeScript Strictness:** The project uses TypeScript and targets ESM/CJS outputs. Adhere to the types defined in `src/types.ts`.
- **Dotted Paths:** The engine supports nested field access using dotted notation (e.g., `meta.region`). Ensure `utils.ts` (specifically `getPath`) is used for resolving these.
- **Pure Functions:** Many core logic pieces (evaluators, parsers) are designed to be pure or minimally stateful within the engine context.

### Testing Practices
- **Vitest:** The primary testing framework is Vitest. Tests are located in the `test/` directory.
- **Functional Testing:** Use `index.test.ts` as a reference for how to test engine functionality, covering various query types (equality, range, boolean, wildcard).
- **Validation:** Always verify query validation logic in `parser.ts` when adding new syntax.

### Contribution Guidelines
- **No Dependencies:** The project aims to be a zero-dependency implementation. Avoid adding new npm dependencies unless absolutely necessary.
- **Performance First:** When modifying `engine.ts` or `indexes.ts`, consider the performance impact on large datasets.
- **Cache Integrity:** Ensure that changes to data evaluation or indexing are reflected/invalidated in the cache if necessary.
