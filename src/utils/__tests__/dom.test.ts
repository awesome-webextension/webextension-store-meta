import { Element, Text, Node } from "domhandler";
import { describe, expect, it } from "vitest";
import { findOne, getText, queryOne } from "../dom";

describe("dom utilities", () => {
  describe("findOne", () => {
    it("should find element matching predicate", () => {
      const node: Node = new Element("div", {}, [
        new Element("span", { id: "target" }, [new Text("test", "text")]),
      ]);
      const result = findOne((el) => el.attribs?.id === "target", [node]);
      expect(result?.name).toBe("span");
      expect(result?.attribs?.id).toBe("target");
    });

    it("should return null if no match found", () => {
      const node: Node = new Element("div", {}, [
        new Element("span", {}, [new Text("test", "text")]),
      ]);
      const result = findOne(
        (el) => el.attribs?.id === "nonexistent",
        [node],
      );
      expect(result).toBeNull();
    });

    it("should recurse into children by default", () => {
      const node: Node = new Element("div", {}, [
        new Element("p", {}, [
          new Element("span", { id: "deep" }, [new Text("deep", "text")]),
        ]),
      ]);
      const result = findOne((el) => el.attribs?.id === "deep", [node]);
      expect(result?.name).toBe("span");
    });

    it("should not recurse when recurse is false", () => {
      const node: Node = new Element("div", {}, [
        new Element("p", {}, [
          new Element("span", { id: "deep" }, [new Text("deep", "text")]),
        ]),
      ]);
      const result = findOne(
        (el) => el.attribs?.id === "deep",
        [node],
        false,
      );
      expect(result).toBeNull();
    });

    it("should handle array of nodes", () => {
      const nodes: Node[] = [
        new Element("span", { id: "first" }, [new Text("a", "text")]),
        new Element("span", { id: "second" }, [new Text("b", "text")]),
      ];
      const result = findOne((el) => el.attribs?.id === "second", nodes);
      expect(result?.attribs?.id).toBe("second");
    });
  });

  describe("getText", () => {
    it("should return empty string for null input", () => {
      expect(getText(null)).toBe("");
    });

    it("should return empty string for undefined input", () => {
      expect(getText(undefined)).toBe("");
    });

    it("should get text from a text node", () => {
      const textNode = new Text("Hello World", "text");
      expect(getText(textNode)).toBe("Hello World");
    });

    it("should handle br tags as newlines", () => {
      const br = new Element("br", {});
      expect(getText(br)).toBe("\n");
    });

    it("should handle element with children", () => {
      const div = new Element("div", {}, [
        new Text("Hello", "text"),
        new Text("World", "text"),
      ]);
      expect(getText(div)).toBe("HelloWorld");
    });

    it("should handle array of nodes", () => {
      const nodes: Node[] = [
        new Text("a", "text"),
        new Text("b", "text"),
      ];
      expect(getText(nodes)).toBe("ab");
    });

    it("should trim whitespace from text nodes", () => {
      const textNode = new Text("  trimmed  ", "text");
      expect(getText(textNode)).toBe("trimmed");
    });
  });

  describe("queryOne", () => {
    it("should find element by class name", () => {
      const node: Node = new Element("div", {}, [
        new Element("span", { class: "target" }, [new Text("test", "text")]),
      ]);
      const result = queryOne([node], "target");
      expect(result?.name).toBe("span");
    });

    it("should return null if class not found", () => {
      const node: Node = new Element("div", {}, [
        new Element("span", { class: "other" }, [new Text("test", "text")]),
      ]);
      const result = queryOne([node], "target");
      expect(result).toBeNull();
    });

    it("should filter by tag name when provided", () => {
      const node: Node = new Element("div", {}, [
        new Element("span", { class: "target" }, [new Text("span", "text")]),
        new Element("div", { class: "target" }, [new Text("div", "text")]),
      ]);
      const result = queryOne([node], "target", "div");
      expect(result?.name).toBe("div");
    });

    it("should return null if tag name doesn't match", () => {
      const node: Node = new Element("div", {}, [
        new Element("span", { class: "target" }, [new Text("span", "text")]),
      ]);
      const result = queryOne([node], "target", "div");
      expect(result).toBeNull();
    });

    it("should handle multiple classes", () => {
      const node: Node = new Element("div", {}, [
        new Element("span", { class: "foo bar baz" }, [
          new Text("test", "text"),
        ]),
      ]);
      const result = queryOne([node], "bar");
      expect(result).not.toBeNull();
    });
  });
});
