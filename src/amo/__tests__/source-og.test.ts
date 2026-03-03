import { DomHandler } from "domhandler";
import { Parser } from "htmlparser2/lib/Parser";
import { describe, expect, it } from "vitest";
import { SourceOG } from "../SourceOG";

function parseToDom(html: string) {
  const handler = new DomHandler();
  new Parser(handler).end(html);
  return handler.dom;
}

describe("SourceOG", () => {
  function makeHTML(ogTags: Record<string, string>) {
    const tags = Object.entries(ogTags)
      .map(([prop, content]) => `<meta property="${prop}" content="${content}">`)
      .join("\n");
    return `
      <!DOCTYPE html>
      <html>
        <head>${tags}</head>
        <body></body>
      </html>
    `;
  }

  it("should extract og:description", () => {
    const dom = parseToDom(
      makeHTML({ "og:description": "A great extension" }),
    );
    const source = new SourceOG(dom);
    expect(source.description()).toBe("A great extension");
  });

  it("should extract og:url", () => {
    const dom = parseToDom(
      makeHTML({ "og:url": "https://addons.mozilla.org/firefox/addon/test/" }),
    );
    const source = new SourceOG(dom);
    expect(source.url()).toBe("https://addons.mozilla.org/firefox/addon/test/");
  });

  it("should extract og:image", () => {
    const dom = parseToDom(
      makeHTML({ "og:image": "https://example.com/image.png" }),
    );
    const source = new SourceOG(dom);
    expect(source.image()).toBe("https://example.com/image.png");
  });

  it("should return null when og tags are missing", () => {
    const dom = parseToDom("<html><head></head><body></body></html>");
    const source = new SourceOG(dom);
    expect(source.description()).toBeNull();
    expect(source.url()).toBeNull();
    expect(source.image()).toBeNull();
  });

  it("should handle meta tags without content attribute", () => {
    const dom = parseToDom(
      '<html><head><meta property="og:description"></head></html>',
    );
    const source = new SourceOG(dom);
    expect(source.description()).toBeNull();
  });

  it("should extract all og properties from a complete page", () => {
    const dom = parseToDom(
      makeHTML({
        "og:description": "Extension desc",
        "og:url": "https://example.com/ext",
        "og:image": "https://example.com/img.jpg",
      }),
    );
    const source = new SourceOG(dom);
    expect(source.description()).toBe("Extension desc");
    expect(source.url()).toBe("https://example.com/ext");
    expect(source.image()).toBe("https://example.com/img.jpg");
  });
});
