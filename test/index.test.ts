import { describe, it, expect, beforeEach } from "vitest";
import { searchJson, searchJsonPaged, validate, initEngine, SearchEngine, VERSION } from "../src/index.js";

const sampleData = [
  { name: "Kuldeep Singh", country: "India", category: "software", active: true, salary: 1000000, tags: ["fiber", "router"] },
  { name: "John Doe", country: "USA", category: "network", active: false, salary: 500000, tags: ["billing"] },
  { name: "Jane Smith", country: "UK", category: "finance", active: true, salary: 750000, tags: ["payments"] },
  { name: "Bob Wilson", country: "Canada", category: "software", active: true, salary: 600000, tags: ["developer"] },
  { name: "Alice Brown", country: "India", category: "software", active: false, salary: 900000, tags: ["desk", "workflow"] },
  { name: "Charlie Davis", country: "Australia", category: "network", active: true, salary: 800000, tags: ["fiber", "router"] },
  { name: "Desk Pro", country: "India", category: "hardware", active: true, salary: 450000, tags: ["desk"] },
  { name: "Network Plus", country: "USA", category: "network", active: true, salary: 550000, tags: ["router"] },
];

describe("json-query-lite", () => {
  describe("basic search", () => {
    it("should search with filter", () => {
      const result = searchJson(sampleData, 'category = "software"');
      expect(result.length).toBe(3);
    });

    it("should filter with equals operator", () => {
      const result = searchJson(sampleData, 'country = "India"');
      expect(result.length).toBe(3);
    });

    it("should filter with AND operator", () => {
      const result = searchJson(sampleData, 'country = "India" AND category = "software"');
      expect(result.length).toBe(2);
    });

    it("should filter with OR operator", () => {
      const result = searchJson(sampleData, 'country = "India" OR country = "USA"');
      expect(result.length).toBe(5);
    });

    it("should filter with NOT operator", () => {
      const result = searchJson(sampleData, 'NOT country = "India"');
      expect(result.length).toBe(5);
    });
  });

  describe("comparison operators", () => {
    it("should filter with > operator", () => {
      const result = searchJson(sampleData, "salary > 700000");
      expect(result.length).toBe(4);
    });

    it("should filter with >= operator", () => {
      const result = searchJson(sampleData, "salary >= 700000");
      expect(result.length).toBe(4);
    });

    it("should filter with < operator", () => {
      const result = searchJson(sampleData, "salary < 600000");
      expect(result.length).toBe(3);
    });

    it("should filter with <= operator", () => {
      const result = searchJson(sampleData, "salary <= 600000");
      expect(result.length).toBe(4);
    });

    it("should filter with != operator", () => {
      const result = searchJson(sampleData, 'country != "India"');
      expect(result.length).toBe(5);
    });
  });

  describe("IN operator", () => {
    it("should filter with IN operator", () => {
      const result = searchJson(sampleData, 'category IN ("software", "network")');
      expect(result.length).toBe(6);
    });

    it("should filter with NOT IN operator", () => {
      const result = searchJson(sampleData, 'NOT category IN ("software", "network")');
      expect(result.length).toBe(2);
    });
  });

  describe("LIKE operator", () => {
    it("should filter with LIKE operator", () => {
      const result = searchJson(sampleData, 'name LIKE "%desk%"');
      expect(result.length).toBe(1);
    });
  });

  describe("BETWEEN operator", () => {
    it("should filter with BETWEEN operator", () => {
      const result = searchJson(sampleData, "salary BETWEEN (500000, 800000)");
      expect(result.length).toBe(5);
    });
  });

  describe("CONTAINS operator", () => {
    it("should filter with CONTAINS operator", () => {
      const result = searchJson(sampleData, 'tags CONTAINS "fiber"');
      expect(result.length).toBe(2);
    });
  });

  describe("simple full-text boolean (implicit AND, parens, wildcards)", () => {
    it("should match explicit AND with wildcards", () => {
      const result = searchJson(sampleData, "India AND fib*");
      expect(result.length).toBe(1);
    });

    it("should match explicit OR with wildcards", () => {
      const r = searchJson(sampleData, "India OR fib*");
      expect(r.length).toBe(4);
    });

    it("should support parenthesized OR same as bare OR", () => {
      const a = searchJson(sampleData, "India OR fib*");
      const b = searchJson(sampleData, "(India OR fib*)");
      expect(b.length).toBe(a.length);
    });

    it("should support AND of parenthesized OR", () => {
      const result = searchJson(sampleData, "India AND (fiber OR desk)");
      expect(result.length).toBe(3);
    });

    it("should support nested parentheses", () => {
      const result = searchJson(sampleData, "((India OR Australia) AND fiber)");
      expect(result.length).toBe(2);
    });

    it("should treat adjacent terms as implicit AND", () => {
      const a = searchJson(sampleData, "India fiber");
      const b = searchJson(sampleData, "India AND fiber");
      expect(a.length).toBe(b.length);
    });

    it("should combine number and following word as one term", () => {
      const rows = [{ label: "10 Gbps port", speed: 10 }];
      expect(searchJson(rows, "10 Gbps").length).toBe(1);
    });
  });

  describe("pagination", () => {
    it("should return paged results", () => {
      const result = searchJsonPaged(sampleData, "LIMIT 3");
      expect(result.rows.length).toBe(3);
      expect(result.totalMatches).toBeGreaterThan(0);
    });
  });

  describe("validation", () => {
    it("should validate a valid query", () => {
      const result = validate('country = "India"');
      expect(result.ok).toBe(true);
    });

    it("should return error for invalid query", () => {
      const result = validate('country = ');
      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("engine", () => {
    let engine: SearchEngine;

    beforeEach(() => {
      engine = initEngine(sampleData);
    });

    it("should create engine from array", () => {
      expect(engine).toBeDefined();
      expect(engine.getDataSize().rowCount).toBe(8);
    });

    it("should search with engine", () => {
      const result = engine.search('country = "India"');
      expect(result.data.length).toBe(3);
    });

    it("should get data size", () => {
      const size = engine.getDataSize();
      expect(size.rowCount).toBe(8);
      expect(size.approxBytes).toBeGreaterThan(0);
    });

    it("should create index", () => {
      engine.createIndex("country");
      const indexes = engine.getIndexes();
      expect(indexes.length).toBeGreaterThan(0);
    });

    it("should update data", () => {
      engine.update([{ name: "New" }]);
      expect(engine.getDataSize().rowCount).toBe(1);
    });
  });

  describe("dotted paths", () => {
    const nestedData = [
      { name: "Test", meta: { region: "APAC", owner: "John" } },
      { name: "Test2", meta: { region: "EMEA" } },
    ];

    it("should filter by dotted path", () => {
      const result = searchJson(nestedData, 'meta.region = "APAC"');
      expect(result.length).toBe(1);
    });
  });

  describe("aggregation", () => {
    let engine: SearchEngine;

    beforeEach(() => {
      engine = initEngine(sampleData);
    });

    it("should compute SUM", () => {
      const result = engine.aggregate({
        aggs: [{ op: "SUM", field: "salary" }],
      });
      expect(result[0].SUM_salary).toBeGreaterThan(0);
    });

    it("should compute AVG", () => {
      const result = engine.aggregate({
        aggs: [{ op: "AVG", field: "salary" }],
      });
      expect(result[0].AVG_salary).toBeGreaterThan(0);
    });

    it("should compute MIN", () => {
      const result = engine.aggregate({
        aggs: [{ op: "MIN", field: "salary" }],
      });
      expect(result[0].MIN_salary).toBe(450000);
    });

    it("should compute MAX", () => {
      const result = engine.aggregate({
        aggs: [{ op: "MAX", field: "salary" }],
      });
      expect(result[0].MAX_salary).toBe(1000000);
    });

    it("should compute COUNT", () => {
      const result = engine.aggregate({
        aggs: [{ op: "COUNT", field: "salary" }],
      });
      expect(result[0].COUNT_salary).toBe(8);
    });

    it("should group by field", () => {
      const result = engine.aggregate({
        groupBy: ["category"],
        aggs: [{ op: "COUNT", field: "*" }],
      });
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("version", () => {
    it("should have version", () => {
      expect(VERSION).toBe("1.0.0");
    });
  });
});
