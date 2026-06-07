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

describe("parse utils", () => {
  it("parses numbers from supported values", () => {
    expect(parseNum(42)).toBe(42);
    expect(parseNum("1,234 users")).toBe(1234);
    expect(parseNum("$4.99")).toBe(4.99);
    expect(parseNum("free")).toBeNull();
    expect(parseNum("")).toBeNull();
  });

  it("parses dotted versions", () => {
    expect(parseVersion("v1.2.3")).toBe("1.2.3");
    expect(parseVersion("version 2")).toBeNull();
    expect(parseVersion("")).toBeNull();
    expect(parseVersion(1)).toBeNull();
  });

  it("normalizes plain objects", () => {
    const object = { ok: true };

    expect(isPlainObject(object)).toBe(true);
    expect(isPlainObject(null)).toBe(false);
    expect(isPlainObject([])).toBe(false);
    expect(toPlainObject(object)).toBe(object);
    expect(toPlainObject([])).toBeUndefined();
  });

  it("normalizes arrays and strings", () => {
    const array = ["a"];

    expect(toArray(array)).toBe(array);
    expect(toArray("a")).toBeUndefined();
    expect(toStr(" value ")).toBe("value");
    expect(toStr("")).toBeNull();
    expect(toStr(1)).toBeNull();
  });

  it("parses JSON objects safely", () => {
    expect(tryJSONParseObject('{"a":1}')).toEqual({ a: 1 });
    expect(tryJSONParseObject("[1]")).toBeUndefined();
    expect(tryJSONParseObject("{")).toBeUndefined();
  });
});
