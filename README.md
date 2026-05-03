# JSON Search Engine

A pure JavaScript/TypeScript search engine for JSON arrays with SQL-like query language.

## Features

- **Smart Search Mode**: Auto-detects full-text vs SQL-like queries
- **Bare text search**: Just type `enterprise` or `350`
- **Multi-word**: `enterprise grade` = AND search
- **AND/OR operators**: `enterprise AND cloud` 
- **Numeric search**: `> 350` searches all numeric fields
- **Full-text boolean search**: AND, OR, NOT operators
- **Query operators**: `=`, `!=`, `>`, `>=`, `<`, `<=`
- **Pattern matching**: LIKE, CONTAINS, STARTS WITH, ENDS WITH
- **Advanced operators**: IN, NOT IN, BETWEEN, REGEX, FUZZY
- **Null handling**: IS NULL, IS NOT NULL, EXISTS
- **Pagination**: Built-in LIMIT/OFFSET support
- **Result caching**: Adaptive caching for fast repeat queries
- **Field indexing**: Inverted indexes for common fields
- **Aggregations**: SUM, AVG, MIN, MAX, COUNT, GROUP BY
- **Dotted paths**: Support for nested fields like `meta.region`

## Installation

```bash
npm install json-search-engine
```

## Quick Start

### ESM/TypeScript

```typescript
import { searchJson, initEngine } from 'json-search-engine';

const data = [
  { name: "John", country: "USA", age: 30 },
  { name: "Jane", country: "UK", age: 25 },
  { name: "Bob", country: "USA", age: 35 }
];

// Simple search
const results = searchJson(data, 'country = "USA"');
// [{ name: "John", country: "USA", age: 30 }, { name: "Bob", country: "USA", age: 35 }]

// Using Engine for better performance
const engine = initEngine(data);
const results = engine.search('age > 25');
```

### CommonJS

```javascript
const { searchJson } = require('json-search-engine');

const results = searchJson(data, 'country = "USA"');
```

### Browser/Salesforce LWC

```html
<script src="json-search-engine.min.js"></script>
<script>
  const results = JsonSearchEngine.searchJson(data, 'country = "USA"');
</script>
```

## Smart Search Mode

The engine automatically detects query type:

### Bare Text (Full-Text Search)

```javascript
// Single word - searches all fields
searchJson(data, 'enterprise')      // finds "enterprise" anywhere

// Multiple words - treated as AND
searchJson(data, 'enterprise grade')  // finds records with BOTH terms

// Numbers - search numeric fields
searchJson(data, '350')              // finds price:350 anywhere
```

### With Operators (SQL-Like)

```javascript
// Field comparison
searchJson(data, 'country = "USA"')
searchJson(data, 'price > 500')

// Full-text with AND/OR
searchJson(data, 'enterprise AND cloud')
searchJson(data, 'offering OR service')
```

### Numeric Comparisons

```javascript
// Search numeric fields with comparison operators
searchJson(data, '> 350')      // any number field > 350
searchJson(data, '< 1000')    // any number field < 1000
searchJson(data, '>= 500')    // any number field >= 500
```

### Query Detection Logic

| Query | Mode | Example |
|-------|------|---------|
| `enterprise` | Full-text | Search all fields |
| `enterprise cloud` | Full-text AND | Both words must match |
| `enterprise AND cloud` | Dumb Search | Explicit AND |
| `name = "John"` | SQL-Like | Field comparison |
| `> 350` | Numeric | Compare all numbers |
| `350` | Full-text | Find "350" anywhere |

## Query Language

### Basic Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `=` | Equals | `country = "USA"` |
| `!=` | Not equals | `age != 30` |
| `>` | Greater than | `salary > 50000` |
| `>=` | Greater or equal | `age >= 18` |
| `<` | Less than | `price < 100` |
| `<=` | Less or equal | `score <= 100` |

### Boolean Operators

```javascript
// AND - both conditions must match
searchJson(data, 'country = "USA" AND age > 25')

// OR - either condition matches
searchJson(data, 'country = "USA" OR country = "UK"')

// NOT - negate condition
searchJson(data, 'NOT country = "USA"')
```

### IN / NOT IN

```javascript
// IN - match any value in list
searchJson(data, 'category IN ("software", "hardware")')

// NOT IN - exclude values
searchJson(data, 'status NOT IN ("deleted", "archived")')
```

### LIKE

```javascript
// % matches any characters
searchJson(data, 'name LIKE "%john%"')

// _ matches single character  
searchJson(data, 'code LIKE "A_"')
```

### BETWEEN

```javascript
// Numeric range
searchJson(data, 'salary BETWEEN (50000, 100000)')

// Alternative syntax
searchJson(data, 'age BETWEEN 18 AND 65')
```

### CONTAINS / STARTS WITH / ENDS WITH

```javascript
// Substring match
searchJson(data, 'name CONTAINS "john"')

// Prefix match
searchJson(data, 'email STARTS WITH "john@"')

// Suffix match
searchJson(data, 'url ENDS WITH ".com"')
```

### Nested Fields

```javascript
const data = [
  { name: "John", meta: { region: "APAC", role: "admin" } },
  { name: "Jane", meta: { region: "EMEA", role: "user" } }
];

searchJson(data, 'meta.region = "APAC"');
searchJson(data, 'meta.role CONTAINS "admin"');
```

### EXISTS / IS NULL

```javascript
// Field exists
searchJson(data, 'email EXISTS')

// IS NULL
searchJson(data, 'deletedAt IS NULL')

// IS NOT NULL  
searchJson(data, 'updatedAt IS NOT NULL')
```

### Aggregations

```javascript
const engine = initEngine(data);

// SUM
engine.aggregate({ aggs: [{ op: "SUM", field: "salary" }] })

// AVG
engine.aggregate({ aggs: [{ op: "AVG", field: "age" }] })

// MIN / MAX
engine.aggregate({ aggs: [{ op: "MIN", field: "price" }] })
engine.aggregate({ aggs: [{ op: "MAX", field: "price" }] })

// COUNT
engine.aggregate({ aggs: [{ op: "COUNT", field: "id" }] })

// GROUP BY
engine.aggregate({ 
  groupBy: ["country"],
  aggs: [{ op: "COUNT", field: "*" }]
})
```

### Pagination

```javascript
// Simple limit
searchJson(data, 'LIMIT 10')

// With offset
searchJson(data, 'LIMIT 10 OFFSET 20')

// Using paged search
const result = engine.searchPaged('country = "USA" LIMIT 5 OFFSET 10');
console.log(result.rows);      // 5 records
console.log(result.totalMatches); // Total count
```

### Ordering

```javascript
searchJson(data, 'ORDER BY age DESC');
searchJson(data, 'ORDER BY name ASC NULLS FIRST');
searchJson(data, 'ORDER BY score DESC, name ASC');
```

## API Reference

### Standalone Functions

```typescript
// Search and return all matching records
searchJson(items: JsonValue[], query: string): JsonValue[]

// Search with pagination
searchJsonPaged(items: JsonValue[], query: string): PagedResult

// Validate query syntax
validate(query: string): ValidationResult
```

### SearchEngine Class

```typescript
class SearchEngine {
  // Create engine with data
  constructor(data: JsonValue[], options?: EngineOptions)
  
  // Search with query
  search(query: string): SearchResult
  
  // Search with pagination
  searchPaged(query: string): PagedResult
  
  // Run aggregations
  aggregate(spec: AggSpec): JsonValue[]
  
  // Validate query
  validate(query: string): ValidationResult
  
  // Get cache statistics
  getCacheStats(): CacheStats
  
  // Get performance metrics
  getMetrics(): EngineMetricsSnapshot
  
  // Get data size info
  getDataSize(): EngineDataSize
  
  // Manage indexes
  createIndex(field: string): void
  dropIndex(field: string): void
  getIndexes(): IndexStats[]
  
  // Update data
  update(data: JsonValue[]): void
}
```

### EngineOptions

```typescript
interface EngineOptions {
  indexes?: string[];        // Fields to index
  queryCacheCap?: number;    // Query cache size
  columnar?: boolean;        // Enable columnar storage
  columnarFields?: string[]; // Fields for columnar
}
```

## Browser Usage (Salesforce LWC)

### Option 1: Static Resource

1. Upload `dist/iife/json-search-engine.min.js` as a static resource
2. Import in LWC:

```javascript
import jsonSearchEngine from '@salesforce/resourceUrl/json_search_engine';
import { loadScript } from 'lightning/platformResourceLoader';

connectedCallback() {
  loadScript(this, jsonSearchEngine).then(() => {
    const engine = JsonSearchEngine.initEngine(this.data);
    const results = engine.search('status = "active"');
  });
}
```

### Option 2: Direct Script Tag

```html
<template>
  <script src="https://your-cdn/json-search-engine.min.js"></script>
</template>
```

## Performance Tips

1. **Use Engine for repeated queries**: Creates indexes and caches results
2. **Index frequently queried fields**: `engine.createIndex("country")`
3. **Use specific field queries**: `country = "USA"` is faster than full-text search
4. **Leverage pagination**: Don't fetch all results at once
5. **Consider strict mode**: Set `strict: true` in options for type-safe comparisons

## License

MIT License - See LICENSE file
