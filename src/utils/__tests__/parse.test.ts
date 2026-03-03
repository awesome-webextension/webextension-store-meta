import { describe, expect, it, vi } from "vitest";
import {
  parseNum,
  parseVersion,
  isPlainObject,
  toPlainObject,
  toArray,
  toStr,
  tryJSONParseObject,
} from "../parse";

describe("parse utilities", () => {
  describe("parseNum", () => {
    it("should parse valid number strings", () => {
      expect(parseNum("123")).toBe(123);
      expect(parseNum("45.67")).toBe(45.67);
    });

    it("should handle numbers with commas", () => {
      expect(parseNum("1,234,567")).toBe(1234567);
      expect(parseNum("1,234.56")).toBe(1234.56);
    });

    it("should handle numbers with prefix characters", () => {
      expect(parseNum("$100")).toBe(100);
      expect(parseNum("about 50")).toBe(50);
    });

    it("should return null for invalid input", () => {
      expect(parseNum("")).toBeNull();
      expect(parseNum("abc")).toBeNull();
      expect(parseNum(null)).toBeNull();
      expect(parseNum(undefined)).toBeNull();
    });

    it("should pass through numbers", () => {
      expect(parseNum(42)).toBe(42);
      expect(parseNum(3.14)).toBe(3.14);
    });
  });

  describe("parseVersion", () => {
    it("should parse semantic versions", () => {
      expect(parseVersion("1.0.0")).toBe("1.0.0");
      expect(parseVersion("2.3.4")).toBe("2.3.4");
    });

    it("should handle v prefix", () => {
      expect(parseVersion("v1.0.0")).toBe("1.0.0");
      expect(parseVersion("v2.3.4")).toBe("2.3.4");
    });

    it("should handle complex version strings", () => {
      expect(parseVersion("Version 1.2.3")).toBe("1.2.3");
      expect(parseVersion("v1.2.3-beta")).toBe("1.2.3");
    });

    it("should return null for invalid input", () => {
      expect(parseVersion("")).toBeNull();
      expect(parseVersion("no version")).toBeNull();
      expect(parseVersion(null)).toBeNull();
      expect(parseVersion(undefined)).toBeNull();
    });
  });

  describe("isPlainObject", () => {
    it("should return true for plain objects", () => {
      expect(isPlainObject({})).toBe(true);
      expect(isPlainObject({ a: 1 })).toBe(true);
    });

    it("should return false for non-objects", () => {
      expect(isPlainObject(null)).toBe(false);
      expect(isPlainObject(undefined)).toBe(false);
      expect(isPlainObject("string")).toBe(false);
      expect(isPlainObject(123)).toBe(false);
    });

    it("should return false for arrays", () => {
      expect(isPlainObject([])).toBe(false);
      expect(isPlainObject([1, 2, 3])).toBe(false);
    });

    it("should return false for built-in objects", () => {
      expect(isPlainObject(new Date())).toBe(false);
      expect(isPlainObject(/regex/)).toBe(false);
    });
  });

  describe("toPlainObject", () => {
    it("should return plain objects", () => {
      expect(toPlainObject({})).toEqual({});
      expect(toPlainObject({ a: 1 })).toEqual({ a: 1 });
    });

    it("should return undefined for non-plain objects", () => {
      expect(toPlainObject(null)).toBeUndefined();
      expect(toPlainObject([])).toBeUndefined();
      expect(toPlainObject("string")).toBeUndefined();
    });
  });

  describe("toArray", () => {
    it("should return arrays", () => {
      expect(toArray([])).toEqual([]);
      expect(toArray([1, 2, 3])).toEqual([1, 2, 3]);
    });

    it("should return undefined for non-arrays", () => {
      expect(toArray(null)).toBeUndefined();
      expect(toArray({})).toBeUndefined();
      expect(toArray("string")).toBeUndefined();
    });
  });

  describe("toStr", () => {
    it("should return trimmed strings", () => {
      expect(toStr("hello")).toBe("hello");
      expect(toStr("  trimmed  ")).toBe("trimmed");
    });

    it("should return null for empty strings", () => {
      expect(toStr("")).toBeNull();
      expect(toStr("   ")).toBeNull();
    });

    it("should return null for non-strings", () => {
      expect(toStr(null)).toBeNull();
      expect(toStr(123)).toBeNull();
      expect(toStr({})).toBeNull();
    });
  });

  describe("tryJSONParseObject", () => {
    it("should parse valid JSON objects", () => {
      expect(tryJSONParseObject('{"a": 1}')).toEqual({ a: 1 });
      expect(tryJSONParseObject("{}")).toEqual({});
    });

    it("should return undefined for invalid JSON", () => {
      expect(tryJSONParseObject("not json")).toBeUndefined();
      expect(tryJSONParseObject("[1, 2, 3]")).toBeUndefined();
      expect(tryJSONParseObject("")).toBeUndefined();
    });
  });
});
