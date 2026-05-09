import { describe, it, expect } from "vitest";
import { searchJson } from "../src/index.js";

const data = [
  {name: 'MainStreet'},
  {name: 'Main Street'},
  {name: 'MainSt'},
  {name: 'Street'}
];

describe("Wildcard Search", () => {
  it("should support LIKE with % suffix", () => {
    // name LIKE "%St" -> matches things ending in St
    // Only MainSt matches
    const result = searchJson(data, 'name LIKE "%St"');
    expect(result.length).toBe(1);
  });

  it("should support LIKE with % prefix", () => {
    // name LIKE "Main%" -> matches things starting with Main
    // MainStreet, Main Street, MainSt
    const result = searchJson(data, 'name LIKE "Main%"');
    expect(result.length).toBe(3);
  });

  it("should support LIKE with % both sides", () => {
    // name LIKE "%Main%" -> matches things containing Main
    const result = searchJson(data, 'name LIKE "%Main%"');
    expect(result.length).toBe(3);
  });

  it("should support CONTAINS", () => {
    const result = searchJson(data, 'name CONTAINS "St"');
    expect(result.length).toBe(4);
  });
});
