import { describe, expect, it } from "vitest";
import * as meta from "../index";

describe("public entry", () => {
  it("re-exports store parsers", () => {
    expect(meta.Amo).toBeTypeOf("function");
    expect(meta.ChromeWebStore).toBeTypeOf("function");
    expect(meta.EdgeAddons).toBeTypeOf("function");
  });
});
