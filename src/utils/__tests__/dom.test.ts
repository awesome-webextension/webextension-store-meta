import { DomHandler } from "domhandler";
import { Parser } from "htmlparser2/lib/Parser";
import { describe, expect, it } from "vitest";
import { findOne, getText, queryOne } from "../dom";

function parseHTML(html: string) {
  const handler = new DomHandler();
  new Parser(handler).end(html);
  return handler.dom;
}

describe("findOne", () => {
  it("should find element matching predicate", () => {
    const dom = parseHTML('<div><span id="target">hello</span></div>');
    const result = findOne((el) => el.attribs.id === "target", dom);
    expect(result).not.toBeNull();
    expect(result?.attribs.id).toBe("target");
  });

  it("should return null if no element matches", () => {
    const dom = parseHTML("<div><span>hello</span></div>");
    const result = findOne((el) => el.attribs.id === "missing", dom);
    expect(result).toBeNull();
  });

  it("should search nested elements recursively by default", () => {
    const dom = parseHTML(
      '<div><section><article><p id="deep">deep</p></article></section></div>',
    );
    const result = findOne((el) => el.attribs.id === "deep", dom);
    expect(result).not.toBeNull();
    expect(result?.name).toBe("p");
  });

  it("should not recurse when recurse is false", () => {
    const dom = parseHTML(
      '<div><span id="nested">nested</span></div><p id="top">top</p>',
    );
    // Top-level nodes are div and p; span is nested in div
    const result = findOne(
      (el) => el.attribs.id === "nested",
      dom,
      false,
    );
    expect(result).toBeNull();
  });

  it("should accept a single node as input", () => {
    const dom = parseHTML(
      '<div id="parent"><span id="child">hello</span></div>',
    );
    const parent = findOne((el) => el.attribs.id === "parent", dom);
    expect(parent).toBeDefined();
    if (!parent) return;

    const child = findOne((el) => el.attribs.id === "child", parent);
    expect(child).not.toBeNull();
    expect(child?.name).toBe("span");
  });

  it("should return the first matching element", () => {
    const dom = parseHTML(
      '<div class="item">first</div><div class="item">second</div>',
    );
    const result = findOne((el) => el.attribs.class === "item", dom);
    expect(result).not.toBeNull();
    if (result) {
      expect(getText(result)).toBe("first");
    }
  });
});

describe("getText", () => {
  it("should extract text from text nodes", () => {
    const dom = parseHTML("<span>hello world</span>");
    const span = findOne((el) => el.name === "span", dom);
    expect(span).not.toBeNull();
    expect(getText(span)).toBe("hello world");
  });

  it("should trim text", () => {
    const dom = parseHTML("<span>  hello  </span>");
    const span = findOne((el) => el.name === "span", dom);
    expect(getText(span)).toBe("hello");
  });

  it("should concatenate text from nested elements", () => {
    const dom = parseHTML("<div><span>hello</span> <b>world</b></div>");
    const div = findOne((el) => el.name === "div", dom);
    expect(getText(div)).toBe("helloworld");
  });

  it("should convert br to newline", () => {
    const dom = parseHTML("<div>line1<br>line2</div>");
    const div = findOne((el) => el.name === "div", dom);
    expect(getText(div)).toContain("\n");
    expect(getText(div)).toContain("line1");
    expect(getText(div)).toContain("line2");
  });

  it("should return empty string for null/undefined", () => {
    expect(getText(null)).toBe("");
    expect(getText(undefined)).toBe("");
  });

  it("should return empty string for empty array", () => {
    expect(getText([])).toBe("");
  });

  it("should handle node arrays", () => {
    const dom = parseHTML("<span>hello</span><span>world</span>");
    expect(getText(dom)).toBe("helloworld");
  });
});

describe("queryOne", () => {
  it("should find element by class name", () => {
    const dom = parseHTML(
      '<div class="container"><span class="target">found</span></div>',
    );
    const result = queryOne(dom, "target");
    expect(result).not.toBeNull();
    if (result) {
      expect(getText(result)).toBe("found");
    }
  });

  it("should match class in multi-class attribute", () => {
    const dom = parseHTML('<div class="foo target bar">found</div>');
    const result = queryOne(dom, "target");
    expect(result).not.toBeNull();
    if (result) {
      expect(getText(result)).toBe("found");
    }
  });

  it("should not partially match class names", () => {
    const dom = parseHTML('<div class="target-extra">not this</div>');
    const result = queryOne(dom, "target");
    expect(result).toBeNull();
  });

  it("should filter by tag name when specified", () => {
    const dom = parseHTML(
      '<div class="item">div</div><span class="item">span</span>',
    );
    const result = queryOne(dom, "item", "span");
    expect(result).not.toBeNull();
    expect(result?.name).toBe("span");
    if (result) {
      expect(getText(result)).toBe("span");
    }
  });

  it("should return null when tag name does not match", () => {
    const dom = parseHTML('<div class="item">div</div>');
    const result = queryOne(dom, "item", "span");
    expect(result).toBeNull();
  });

  it("should return null when no elements have the class", () => {
    const dom = parseHTML("<div><span>no class</span></div>");
    const result = queryOne(dom, "missing");
    expect(result).toBeNull();
  });
});
