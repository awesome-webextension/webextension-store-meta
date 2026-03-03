import { describe, expect, it } from "vitest";
import {
  isPlainObject,
  parseNum,
  parseVersion,
  toArray,
  toPlainObject,
  toStr,
  tryJSONParseObject,
} from "../parse";

describe("parseNum", () => {
  it("should parse integer strings", () => {
    expect(parseNum("42")).toBe(42);
    expect(parseNum("0")).toBe(0);
  });

  it("should parse float strings", () => {
    expect(parseNum("3.14")).toBe(3.14);
    expect(parseNum("0.5")).toBe(0.5);
  });

  it("should strip leading non-numeric characters", () => {
    expect(parseNum("$100")).toBe(100);
    expect(parseNum("USD 9.99")).toBe(9.99);
  });

  it("should handle comma-separated numbers", () => {
    expect(parseNum("1,000")).toBe(1000);
    expect(parseNum("1,234,567")).toBe(1234567);
    expect(parseNum("1,234.56")).toBe(1234.56);
  });

  it("should pass through numbers directly", () => {
    expect(parseNum(42)).toBe(42);
    expect(parseNum(0)).toBe(0);
    expect(parseNum(3.14)).toBe(3.14);
  });

  it("should return null for empty/falsy values", () => {
    expect(parseNum("")).toBeNull();
    expect(parseNum(null)).toBeNull();
    expect(parseNum(undefined)).toBeNull();
    expect(parseNum(false)).toBeNull();
  });

  it("should return null for non-numeric strings", () => {
    expect(parseNum("abc")).toBeNull();
    expect(parseNum("not a number")).toBeNull();
  });

  it("should return null for NaN", () => {
    expect(parseNum(Number.NaN)).toBeNull();
  });
});

describe("parseVersion", () => {
  it("should extract version from plain version strings", () => {
    expect(parseVersion("1.2.3")).toBe("1.2.3");
    expect(parseVersion("0.1.0")).toBe("0.1.0");
    expect(parseVersion("10.20.30")).toBe("10.20.30");
  });

  it("should extract version with v prefix", () => {
    expect(parseVersion("v1.2.3")).toBe("1.2.3");
    expect(parseVersion("v0.1.0")).toBe("0.1.0");
  });

  it("should extract version from surrounding text", () => {
    expect(parseVersion("Version 1.2.3")).toBe("1.2.3");
    expect(parseVersion("version: 2.0.1")).toBe("2.0.1");
  });

  it("should handle two-part versions", () => {
    expect(parseVersion("1.0")).toBe("1.0");
  });

  it("should handle four-part versions", () => {
    expect(parseVersion("1.2.3.4")).toBe("1.2.3.4");
  });

  it("should return null for non-version strings", () => {
    expect(parseVersion("hello")).toBeNull();
    expect(parseVersion("123")).toBeNull();
  });

  it("should return null for non-string inputs", () => {
    expect(parseVersion(null)).toBeNull();
    expect(parseVersion(undefined)).toBeNull();
    expect(parseVersion(123)).toBeNull();
    expect(parseVersion("")).toBeNull();
  });
});

describe("isPlainObject", () => {
  it("should return true for plain objects", () => {
    expect(isPlainObject({})).toBe(true);
    expect(isPlainObject({ a: 1 })).toBe(true);
  });

  it("should return false for non-plain objects", () => {
    expect(isPlainObject(null)).toBe(false);
    expect(isPlainObject(undefined)).toBe(false);
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject("string")).toBe(false);
    expect(isPlainObject(42)).toBe(false);
    expect(isPlainObject(new Date())).toBe(false);
  });
});

describe("toPlainObject", () => {
  it("should return the object if it is a plain object", () => {
    const obj = { key: "value" };
    expect(toPlainObject(obj)).toBe(obj);
  });

  it("should return undefined for non-plain objects", () => {
    expect(toPlainObject(null)).toBeUndefined();
    expect(toPlainObject([])).toBeUndefined();
    expect(toPlainObject("string")).toBeUndefined();
    expect(toPlainObject(42)).toBeUndefined();
  });
});

describe("toArray", () => {
  it("should return the array if input is an array", () => {
    const arr = [1, 2, 3];
    expect(toArray(arr)).toBe(arr);
    expect(toArray([])).toEqual([]);
  });

  it("should return undefined for non-arrays", () => {
    expect(toArray(null)).toBeUndefined();
    expect(toArray({})).toBeUndefined();
    expect(toArray("string")).toBeUndefined();
    expect(toArray(42)).toBeUndefined();
  });
});

describe("toStr", () => {
  it("should return trimmed string for non-empty strings", () => {
    expect(toStr("hello")).toBe("hello");
    expect(toStr("  hello  ")).toBe("hello");
  });

  it("should return null for empty or whitespace-only strings", () => {
    expect(toStr("")).toBeNull();
    expect(toStr("   ")).toBeNull();
  });

  it("should return null for non-string values", () => {
    expect(toStr(null)).toBeNull();
    expect(toStr(undefined)).toBeNull();
    expect(toStr(42)).toBeNull();
    expect(toStr({})).toBeNull();
  });
});

describe("tryJSONParseObject", () => {
  it("should parse valid JSON objects", () => {
    expect(tryJSONParseObject('{"key":"value"}')).toEqual({ key: "value" });
    expect(tryJSONParseObject('{"a":1,"b":2}')).toEqual({ a: 1, b: 2 });
  });

  it("should return undefined for JSON arrays", () => {
    expect(tryJSONParseObject("[1,2,3]")).toBeUndefined();
  });

  it("should return undefined for JSON primitives", () => {
    expect(tryJSONParseObject('"string"')).toBeUndefined();
    expect(tryJSONParseObject("42")).toBeUndefined();
    expect(tryJSONParseObject("true")).toBeUndefined();
    expect(tryJSONParseObject("null")).toBeUndefined();
  });

  it("should return undefined for invalid JSON", () => {
    expect(tryJSONParseObject("{invalid}")).toBeUndefined();
    expect(tryJSONParseObject("")).toBeUndefined();
    expect(tryJSONParseObject("not json")).toBeUndefined();
  });
});
