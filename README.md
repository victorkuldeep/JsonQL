# json-query-lite

A pure JavaScript/TypeScript search engine for JSON arrays with a powerful SQL-like query language and BM25 relevance scoring.

## Features

- **Relevance Scoring (BM25)**: Industry-standard relevance ranking with dynamic normalization (0-100%).
- **Smart Search Mode**: Auto-detects full-text vs SQL-like queries.
- **Multi-Column Sorting**: Support for tiered ordering (e.g., `ORDER BY country, SCORE DESC`).
- **Professional Dashboard**: Built-in playground with 50+ searchable use cases.
- **Query operators**: `=`, `!=`, `>`, `>=`, `<`, `<=`, `LIKE`, `IN`, `BETWEEN`.
- **Advanced Text Search**: `CONTAINS`, `STARTS WITH`, `ENDS WITH`, `REGEX`, `FUZZY`.
- **Null & Array Handling**: `IS NULL`, `EXISTS`, empty array `[]` support.
- **Performance**: Inverted indexing, adaptive result caching, and query AST caching.
- **Zero Dependencies**: Pure TypeScript implementation, ideal for Browser, Node.js, and Salesforce LWC.

## Installation

```bash
npm install json-query-lite
```

## Quick Start

### ESM / TypeScript

```typescript
import { searchJson, initEngine } from 'json-query-lite';

const data = [
  { name: "John", country: "USA", salary: 1000000 },
  { name: "Jane", country: "UK", salary: 1200000 }
];

// Simple search
const results = searchJson(data, 'country = "USA"');

// Using Engine for Relevance Scoring & Indexing
const engine = initEngine(data);
const results = engine.search('name CONTAINS "Jo" ORDER BY SCORE DESC');
console.log(results.data[0].SCORE); // Dynamic relevance match
```

### Browser / Salesforce LWC

```html
<script src="json-query-lite.min.js"></script>
<script>
  const engine = JsonSearchEngine.initEngine(data);
  const results = engine.search('country = "India" ORDER BY SCORE DESC');
</script>
```

## Smart Search Mode

The engine automatically detects the query type:

### Full-Text Discovery
```sql
-- Single word search across all fields
enterprise

-- Implicit AND search
enterprise grade

-- Phrase search (exact)
"enterprise grade"
```

### SQL-Like Predicates
```sql
-- Field comparison
country = "USA" AND salary > 500000

-- Membership & Ranges
category IN ("software", "iot")
price BETWEEN (100, 500)
```

### Global Numeric Comparisons
```sql
-- Search ALL numeric fields
> 350
```

## BM25 Relevance Scoring

JsonQL calculates relevance using **BM25**, considering term frequency (TF), rarity (IDF), and document length.

*   **Dynamic Normalization:** Scores are scaled relative to the best match in your specific query, providing a user-friendly **0-100% Match** indicator.
*   **Ranking:** Use `ORDER BY SCORE DESC` to show the most relevant items first.

## Professional Dashboard

The project includes a high-performance dashboard (`demo/index.html`) that loads **50,000 records** and provides a searchable **Query Library** with over 50 interactive examples.

To run the demo:
```bash
npx serve .
```
Then navigate to `/demo`.

## API Reference

### Standalone Functions
*   `searchJson(items, query)`: Simple filter.
*   `searchJsonPaged(items, query)`: Filter with pagination metadata.
*   `validate(query)`: Syntax validation.

### SearchEngine Class
*   `search(query)`: Executes query with scoring and caching.
*   `aggregate(spec)`: Runs SUM, AVG, MIN, MAX, COUNT, GROUP BY.
*   `createIndex(field)`: Manually create an inverted index for O(1) lookups.

## Performance Tips

1.  **Use Engine Instances:** `initEngine` creates indexes and enables the 0-100% normalization logic.
2.  **Index Key Fields:** Use `engine.createIndex("your_field")` for high-frequency filters.
3.  **Leverage Pagination:** Always use `LIMIT` for large datasets to keep the DOM responsive.

## License

MIT License - See LICENSE file
