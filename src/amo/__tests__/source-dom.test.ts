import { DomHandler } from "domhandler";
import { Parser } from "htmlparser2/lib/Parser";
import { describe, expect, it } from "vitest";
import { SourceDOM } from "../SourceDOM";

function parseToDom(html: string) {
  const handler = new DomHandler();
  new Parser(handler).end(html);
  return handler.dom;
}

describe("SourceDOM", () => {
  function makeAmoHTML(opts: {
    name?: string;
    description?: string;
    ratingValue?: string;
    ratingCount?: string;
    users?: string;
    version?: string;
    url?: string;
    image?: string;
    size?: string;
    lastUpdated?: string;
  }) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          ${opts.url ? `<link rel="canonical" href="${opts.url}">` : ""}
        </head>
        <body>
          ${
            opts.name
              ? `<h1 class="AddonTitle"><span>${opts.name}</span> by Author</h1>`
              : ""
          }
          ${
            opts.description
              ? `<div class="Addon-summary">${opts.description}</div>`
              : ""
          }
          ${
            opts.ratingValue || opts.ratingCount || opts.users
              ? `<div class="AddonBadges">
                  ${
                    opts.ratingValue || opts.ratingCount
                      ? `<div data-testid="badge-star-rating">${opts.ratingValue || "0"}${opts.ratingCount ? ` (${opts.ratingCount})` : ""}</div>`
                      : ""
                  }
                  ${
                    opts.users
                      ? `<div data-testid="badge-user-count">${opts.users}</div>`
                      : ""
                  }
                </div>`
              : ""
          }
          ${
            opts.version
              ? `<div class="AddonMoreInfo-version">${opts.version}</div>`
              : ""
          }
          ${
            opts.image
              ? `<div class="ScreenShots"><img class="ScreenShots-image" src="${opts.image}"></div>`
              : ""
          }
          ${
            opts.size
              ? `<div class="AddonMoreInfo-filesize">${opts.size}</div>`
              : ""
          }
          ${
            opts.lastUpdated
              ? `<div class="AddonMoreInfo-last-updated">${opts.lastUpdated}</div>`
              : ""
          }
        </body>
      </html>
    `;
  }

  const fullOpts = {
    name: "uBlock Origin",
    description: "An efficient wide-spectrum content blocker",
    ratingValue: "4.7",
    ratingCount: "15,000",
    users: "500,000",
    version: "1.55.0",
    url: "https://addons.mozilla.org/firefox/addon/ublock-origin/",
    image: "https://example.com/screenshot.png",
    size: "4.5 MB",
    lastUpdated: "Jan 15, 2024",
  };

  it("should extract name from AddonTitle", () => {
    const dom = parseToDom(makeAmoHTML(fullOpts));
    const source = new SourceDOM(dom);
    expect(source.name()).toBe("uBlock Origin");
  });

  it("should extract description from Addon-summary", () => {
    const dom = parseToDom(makeAmoHTML(fullOpts));
    const source = new SourceDOM(dom);
    expect(source.description()).toBe(
      "An efficient wide-spectrum content blocker",
    );
  });

  it("should extract rating value from badge", () => {
    const dom = parseToDom(makeAmoHTML(fullOpts));
    const source = new SourceDOM(dom);
    expect(source.ratingValue()).toBe(4.7);
  });

  it("should extract rating count from badge", () => {
    const dom = parseToDom(makeAmoHTML(fullOpts));
    const source = new SourceDOM(dom);
    expect(source.ratingCount()).toBe(15000);
  });

  it("should extract users from badge", () => {
    const dom = parseToDom(makeAmoHTML(fullOpts));
    const source = new SourceDOM(dom);
    expect(source.users()).toBe(500000);
  });

  it("should extract version", () => {
    const dom = parseToDom(makeAmoHTML(fullOpts));
    const source = new SourceDOM(dom);
    expect(source.version()).toBe("1.55.0");
  });

  it("should extract canonical url", () => {
    const dom = parseToDom(makeAmoHTML(fullOpts));
    const source = new SourceDOM(dom);
    expect(source.url()).toBe(
      "https://addons.mozilla.org/firefox/addon/ublock-origin/",
    );
  });

  it("should extract image from ScreenShots", () => {
    const dom = parseToDom(makeAmoHTML(fullOpts));
    const source = new SourceDOM(dom);
    expect(source.image()).toBe("https://example.com/screenshot.png");
  });

  it("should extract size", () => {
    const dom = parseToDom(makeAmoHTML(fullOpts));
    const source = new SourceDOM(dom);
    expect(source.size()).toBe("4.5 MB");
  });

  it("should extract lastUpdated", () => {
    const dom = parseToDom(makeAmoHTML(fullOpts));
    const source = new SourceDOM(dom);
    expect(source.lastUpdated()).toBe("Jan 15, 2024");
  });

  it("should return null values for empty HTML", () => {
    const dom = parseToDom("<html><head></head><body></body></html>");
    const source = new SourceDOM(dom);
    expect(source.name()).toBeNull();
    expect(source.description()).toBeNull();
    expect(source.ratingValue()).toBeNull();
    expect(source.ratingCount()).toBeNull();
    expect(source.users()).toBeNull();
    expect(source.version()).toBeNull();
    expect(source.url()).toBeNull();
    expect(source.image()).toBeNull();
    expect(source.size()).toBeNull();
    expect(source.lastUpdated()).toBeNull();
  });

  it("should fall back to Description class when Addon-summary is missing", () => {
    const html = `
      <html><body>
        <div class="Description">Fallback description text</div>
      </body></html>
    `;
    const dom = parseToDom(html);
    const source = new SourceDOM(dom);
    expect(source.description()).toBe("Fallback description text");
  });
});
