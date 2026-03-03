import { describe, expect, it } from "vitest";
import { parseRattingValue } from "../utils";

describe("parseRattingValue", () => {
  it("should return number for valid rating values (0-5)", () => {
    expect(parseRattingValue(0)).toBe(0);
    expect(parseRattingValue(1)).toBe(1);
    expect(parseRattingValue(2.5)).toBe(2.5);
    expect(parseRattingValue(4.3)).toBe(4.3);
    expect(parseRattingValue(5)).toBe(5);
  });

  it("should parse rating from string", () => {
    expect(parseRattingValue("4.5")).toBe(4.5);
    expect(parseRattingValue("0")).toBe(0);
    expect(parseRattingValue("5")).toBe(5);
  });

  it("should return null for values outside 0-5 range", () => {
    expect(parseRattingValue(5.1)).toBeNull();
    expect(parseRattingValue(6)).toBeNull();
    expect(parseRattingValue(-1)).toBeNull();
    expect(parseRattingValue(100)).toBeNull();
  });

  it("should return null for non-numeric values", () => {
    expect(parseRattingValue(null)).toBeNull();
    expect(parseRattingValue(undefined)).toBeNull();
    expect(parseRattingValue("abc")).toBeNull();
    expect(parseRattingValue("")).toBeNull();
  });
});
