import { describe, it, expect } from "vitest";
import { initEngine } from "../src/index.js";

const scoreData = [
  { id: 1, text: "apple apple apple", desc: "triple match" }, 
  { id: 2, text: "apple", desc: "single match short" },      
  { id: 3, text: "apple", desc: "single match but this document is significantly longer than the other ones to test length normalization" },  
  { id: 4, text: "banana", desc: "rare term match" },
];

// Add many filler docs to make 'banana' rare (IDF) and 'apple' common
for (let i = 5; i <= 100; i++) {
  scoreData.push({ id: i, text: "apple", desc: "common apple doc" });
}

describe("BM25 Scoring", () => {
  it("should rank by term frequency (TF)", () => {
    const engine = initEngine(scoreData);
    const result = engine.search('apple ORDER BY SCORE DESC');
    
    // id=1 has TF=3, others have TF=1
    expect((result.data[0] as any).id).toBe(1);
  });

  it("should rank by document length normalization", () => {
    const engine = initEngine(scoreData);
    const result = engine.search('apple ORDER BY SCORE DESC');
    
    const ids = result.data.map((r: any) => r.id);
    const posShort = ids.indexOf(2);
    const posLong = ids.indexOf(3);
    
    // id=2 (short) should rank higher than id=3 (long) for same TF=1
    expect(posShort).toBeLessThan(posLong);
  });

  it("should rank by inverse document frequency (IDF)", () => {
    const engine = initEngine(scoreData);
    
    // 'banana' is in 1 doc (id=4). 'apple' is in ~100 docs.
    // 'banana' should have a much higher IDF.
    const result = engine.search('apple OR banana ORDER BY SCORE DESC');
    
    // id=4 (banana) should be ranked very high, likely first or second 
    // depending on id=1's TF=3 boost.
    expect((result.data[0] as any).id).toBe(4);
  });
  
  it("should support SCORE in SELECT and preserve it", () => {
    const engine = initEngine(scoreData);
    const result = engine.search('SELECT id, SCORE WHERE apple ORDER BY SCORE DESC');
    
    expect(result.data[0]).toHaveProperty("id");
    expect(result.data[0]).toHaveProperty("SCORE");
    expect((result.data[0] as any).SCORE).toBeGreaterThan(0);
  });
});
