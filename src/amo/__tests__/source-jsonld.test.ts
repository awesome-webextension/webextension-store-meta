import { DomHandler } from "domhandler";
import { Parser } from "htmlparser2/lib/Parser";
import { describe, expect, it } from "vitest";
import { SourceJSONLD } from "../SourceJSONLD";

function parseToDom(html: string) {
  const handler = new DomHandler();
  new Parser(handler).end(html);
  return handler.dom;
}

describe("SourceJSONLD", () => {
  const validJSONLD = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Test Extension",
    description: "A test extension description",
    url: "https://addons.mozilla.org/firefox/addon/test-extension/",
    image: "https://example.com/icon.png",
    version: "2.1.0",
    operatingSystem: "Firefox",
    offers: {
      price: 0,
      priceCurrency: "USD",
    },
    aggregateRating: {
      ratingValue: 4.5,
      ratingCount: 1234,
    },
  };

  function makeHTML(jsonld: object) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <script type="application/ld+json">${JSON.stringify(jsonld)}</script>
        </head>
        <body></body>
      </html>
    `;
  }

  it("should extract name from JSON-LD", () => {
    const dom = parseToDom(makeHTML(validJSONLD));
    const source = new SourceJSONLD(dom);
    expect(source.name()).toBe("Test Extension");
  });

  it("should extract description from JSON-LD", () => {
    const dom = parseToDom(makeHTML(validJSONLD));
    const source = new SourceJSONLD(dom);
    expect(source.description()).toBe("A test extension description");
  });

  it("should extract version from JSON-LD", () => {
    const dom = parseToDom(makeHTML(validJSONLD));
    const source = new SourceJSONLD(dom);
    expect(source.version()).toBe("2.1.0");
  });

  it("should extract url from JSON-LD", () => {
    const dom = parseToDom(makeHTML(validJSONLD));
    const source = new SourceJSONLD(dom);
    expect(source.url()).toBe(
      "https://addons.mozilla.org/firefox/addon/test-extension/",
    );
  });

  it("should extract image from JSON-LD", () => {
    const dom = parseToDom(makeHTML(validJSONLD));
    const source = new SourceJSONLD(dom);
    expect(source.image()).toBe("https://example.com/icon.png");
  });

  it("should extract operatingSystem from JSON-LD", () => {
    const dom = parseToDom(makeHTML(validJSONLD));
    const source = new SourceJSONLD(dom);
    expect(source.operatingSystem()).toBe("Firefox");
  });

  it("should extract rating value from JSON-LD", () => {
    const dom = parseToDom(makeHTML(validJSONLD));
    const source = new SourceJSONLD(dom);
    expect(source.ratingValue()).toBe(4.5);
  });

  it("should extract rating count from JSON-LD", () => {
    const dom = parseToDom(makeHTML(validJSONLD));
    const source = new SourceJSONLD(dom);
    expect(source.ratingCount()).toBe(1234);
  });

  it("should extract price from JSON-LD", () => {
    const dom = parseToDom(makeHTML(validJSONLD));
    const source = new SourceJSONLD(dom);
    expect(source.price()).toBe(0);
  });

  it("should extract priceCurrency from JSON-LD", () => {
    const dom = parseToDom(makeHTML(validJSONLD));
    const source = new SourceJSONLD(dom);
    expect(source.priceCurrency()).toBe("USD");
  });

  it("should return null values when JSON-LD is missing", () => {
    const dom = parseToDom("<html><head></head><body></body></html>");
    const source = new SourceJSONLD(dom);
    expect(source.name()).toBeNull();
    expect(source.description()).toBeNull();
    expect(source.version()).toBeNull();
    expect(source.url()).toBeNull();
    expect(source.image()).toBeNull();
    expect(source.operatingSystem()).toBeNull();
    expect(source.ratingValue()).toBeNull();
    expect(source.ratingCount()).toBeNull();
    expect(source.price()).toBeNull();
    expect(source.priceCurrency()).toBeNull();
  });

  it("should return null values when JSON-LD is invalid", () => {
    const dom = parseToDom(
      '<html><head><script type="application/ld+json">{invalid json</script></head></html>',
    );
    const source = new SourceJSONLD(dom);
    expect(source.name()).toBeNull();
  });

  it("should handle JSON-LD without optional fields", () => {
    const minimal = { name: "Minimal", description: "Desc" };
    const dom = parseToDom(makeHTML(minimal));
    const source = new SourceJSONLD(dom);
    expect(source.name()).toBe("Minimal");
    expect(source.description()).toBe("Desc");
    expect(source.ratingValue()).toBeNull();
    expect(source.price()).toBeNull();
    expect(source.operatingSystem()).toBeNull();
  });

  it("should reject rating values outside 0-5 range", () => {
    const badRating = {
      ...validJSONLD,
      aggregateRating: { ratingValue: 10, ratingCount: 5 },
    };
    const dom = parseToDom(makeHTML(badRating));
    const source = new SourceJSONLD(dom);
    expect(source.ratingValue()).toBeNull();
  });
});
