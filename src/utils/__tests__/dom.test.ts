import { DomHandler } from "domhandler";
import { Parser } from "htmlparser2/lib/Parser";
import { describe, expect, it } from "vitest";
import { findOne, getText, queryOne } from "../dom";

const parseHTML = (html: string) => {
  const handler = new DomHandler();
  new Parser(handler).end(html);
  return handler.dom;
};

const parseXML = (xml: string) => {
  const handler = new DomHandler(undefined, { xmlMode: true });
  new Parser(handler, { xmlMode: true }).end(xml);
  return handler.dom;
};

describe("dom utils", () => {
  it("finds matching elements recursively or non-recursively", () => {
    const dom = parseHTML("<div><span>target</span></div>text");

    expect(findOne((el) => el.name === "span", dom)?.name).toBe("span");
    expect(findOne((el) => el.name === "span", dom[0], false)).toBeNull();
    expect(findOne((el) => el.name === "main", dom)).toBeNull();
  });

  it("gets trimmed text from supported node shapes", () => {
    const dom = parseHTML("<p> hello <br> world </p><!-- ignored -->");
    const cdata = parseXML("<![CDATA[ cdata ]]>");

    expect(getText()).toBe("");
    expect(getText(dom)).toBe("hello\nworld");
    expect(getText(cdata[0])).toBe("cdata");
    expect(getText(dom[1])).toBe("");
  });

  it("queries by class and optional tag", () => {
    const dom = parseHTML(`
      <section>
        <span class="alpha beta">wrong tag</span>
        <a class="alpha beta">right tag</a>
      </section>
    `);

    expect(queryOne(dom, "beta")?.name).toBe("span");
    expect(queryOne(dom, "beta", "a")?.name).toBe("a");
    expect(queryOne(dom, "missing")).toBeNull();
    expect(queryOne(dom, "beta", "button")).toBeNull();
  });
});
