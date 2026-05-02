# Developer Guide

## Prerequisites

- Node.js 18+
- npm 9+

## Setup

```bash
# Clone the repository
git clone <repository-url>
cd json-search-engine

# Install dependencies
npm install
```

## Development Commands

```bash
# Build all formats
npm run build

# Build specific formats
npm run build:esm      # ES Modules
npm run build:cjs      # CommonJS  
npm run build:iife     # IIFE bundle
npm run build:min      # Minified IIFE

# Run tests
npm test              # Run all tests once
npm run test:watch    # Watch mode

# Lint code
npm run lint

# Format code
npm run format
```

## Project Structure

```
json-search-engine/
├── src/
│   ├── types.ts         # Type definitions
│   ├── lexer.ts        # Tokenizer
│   ├── parser.ts       # Query parser
│   ├── engine.ts       # Expression evaluator
│   ├── utils.ts       # Utility functions
│   ├── indexes.ts     # Field indexing
│   ├── cache.ts       # Query/result caching
│   ├── aggregates.ts  # Aggregation functions
│   ├── engine-class.ts # Main SearchEngine class
│   └── index.ts      # Public exports
├── test/
│   └── index.test.ts  # Test suite
├── dist/              # Build output
│   ├── esm/          # ES Modules
│   ├── cjs/          # CommonJS
│   └── iife/         # Browser bundles
├── rollup.config.js   # IIFE build config
├── tsconfig.json      # TypeScript config
└── package.json
```

## Adding New Operators

### 1. Define Token Kind

In `src/types.ts`, add to `TokenKind` enum:

```typescript
export enum TokenKind {
  // ... existing
  NewOp = "NewOp",
}
```

### 2. Add Parser Support

In `src/parser.ts`:

```typescript
// In parsePredicate()
case TokenKind.NewOp => {
  // Parse the operator
}
```

### 3. Add Evaluator

In `src/engine.ts`:

```typescript
// In evalPredicate()
case Op.NewOp: {
  // Implement evaluation logic
}
```

### 4. Add Tests

In `test/index.test.ts`:

```typescript
describe("NEWOP operator", () => {
  it("should handle new operator", () => {
    const result = searchJson(data, 'field NEWOP "value"');
    expect(result.length).toBe(1);
  });
});
```

## Running Specific Tests

```bash
# Run tests matching pattern
npm test -- --grep "aggregation"

# Run in watch mode
npm run test:watch
```

## Building for Production

```bash
# Full build with all formats
npm run build

# Just IIFE for Salesforce
npm run build:iife
npm run build:min
```

## Code Style

- Use TypeScript strict mode
- Run `npm run format` before committing
- Follow existing patterns in source files

## Adding Dependencies

```bash
# Production dependency
npm install <package>

# Dev dependency
npm install <package> --save-dev
```

## Troubleshooting

### Build Errors

```bash
# Clean build artifacts
rm -rf dist

# Rebuild
npm run build
```

### Test Failures

```bash
# Run single test file
npm test -- test/index.test.ts

# Run with verbose output
npm test -- --reporter=verbose
```

## Release Process

1. Update version in `package.json`
2. Run `npm run build`
3. Run `npm test`
4. Commit changes
5. Tag release: `git tag v1.x.x`
6. Push: `git push --tags`
