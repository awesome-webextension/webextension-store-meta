import { DomHandler } from "domhandler";
import { Parser } from "htmlparser2/lib/Parser";
import { describe, expect, it } from "vitest";
import { SourceReduxStoreState } from "../SourceReduxStoreState";

function parseToDom(html: string) {
  const handler = new DomHandler();
  new Parser(handler).end(html);
  return handler.dom;
}

describe("SourceReduxStoreState", () => {
  const addonId = "test-addon-guid";

  function makeReduxState(addon: object, version?: object) {
    const state: Record<string, unknown> = {
      addons: {
        byID: {
          [addonId]: addon,
        },
      },
    };

    if (version) {
      state.versions = {
        byId: {
          42: version,
        },
      };
    }

    return state;
  }

  function makeHTML(state: object) {
    return `
      <!DOCTYPE html>
      <html>
        <head></head>
        <body>
          <script id="redux-store-state">${JSON.stringify(state)}</script>
        </body>
      </html>
    `;
  }

  const fullAddon = {
    name: "Test Extension",
    description: "A test extension for Firefox",
    url: "https://addons.mozilla.org/firefox/addon/test/",
    average_daily_users: 50000,
    currentVersionId: 42,
    ratings: {
      average: 4.7,
      count: 2500,
    },
    previews: [{ src: "https://example.com/screenshot.png" }],
  };

  const fullVersion = {
    version: "3.2.1",
    file: {
      size: 1048576,
      created: "2024-01-15T10:30:00Z",
    },
  };

  it("should extract name", () => {
    const dom = parseToDom(makeHTML(makeReduxState(fullAddon, fullVersion)));
    const source = new SourceReduxStoreState(dom);
    expect(source.name()).toBe("Test Extension");
  });

  it("should extract description", () => {
    const dom = parseToDom(makeHTML(makeReduxState(fullAddon, fullVersion)));
    const source = new SourceReduxStoreState(dom);
    expect(source.description()).toBe("A test extension for Firefox");
  });

  it("should extract url", () => {
    const dom = parseToDom(makeHTML(makeReduxState(fullAddon, fullVersion)));
    const source = new SourceReduxStoreState(dom);
    expect(source.url()).toBe(
      "https://addons.mozilla.org/firefox/addon/test/",
    );
  });

  it("should extract users", () => {
    const dom = parseToDom(makeHTML(makeReduxState(fullAddon, fullVersion)));
    const source = new SourceReduxStoreState(dom);
    expect(source.users()).toBe(50000);
  });

  it("should extract rating value", () => {
    const dom = parseToDom(makeHTML(makeReduxState(fullAddon, fullVersion)));
    const source = new SourceReduxStoreState(dom);
    expect(source.ratingValue()).toBe(4.7);
  });

  it("should extract rating count", () => {
    const dom = parseToDom(makeHTML(makeReduxState(fullAddon, fullVersion)));
    const source = new SourceReduxStoreState(dom);
    expect(source.ratingCount()).toBe(2500);
  });

  it("should extract version", () => {
    const dom = parseToDom(makeHTML(makeReduxState(fullAddon, fullVersion)));
    const source = new SourceReduxStoreState(dom);
    expect(source.version()).toBe("3.2.1");
  });

  it("should extract image from first preview", () => {
    const dom = parseToDom(makeHTML(makeReduxState(fullAddon, fullVersion)));
    const source = new SourceReduxStoreState(dom);
    expect(source.image()).toBe("https://example.com/screenshot.png");
  });

  it("should extract size as human-readable string", () => {
    const dom = parseToDom(makeHTML(makeReduxState(fullAddon, fullVersion)));
    const source = new SourceReduxStoreState(dom);
    expect(source.size()).toBe("1.05 MB");
  });

  it("should extract lastUpdated", () => {
    const dom = parseToDom(makeHTML(makeReduxState(fullAddon, fullVersion)));
    const source = new SourceReduxStoreState(dom);
    expect(source.lastUpdated()).toBe("2024-01-15T10:30:00Z");
  });

  it("should return null values when redux state is missing", () => {
    const dom = parseToDom("<html><head></head><body></body></html>");
    const source = new SourceReduxStoreState(dom);
    expect(source.name()).toBeNull();
    expect(source.description()).toBeNull();
    expect(source.url()).toBeNull();
    expect(source.users()).toBeNull();
    expect(source.ratingValue()).toBeNull();
    expect(source.ratingCount()).toBeNull();
    expect(source.version()).toBeNull();
    expect(source.image()).toBeNull();
    expect(source.size()).toBeNull();
    expect(source.lastUpdated()).toBeNull();
  });

  it("should return null for version-dependent fields when no version info exists", () => {
    const addonWithoutVersion = { ...fullAddon, currentVersionId: undefined };
    const dom = parseToDom(
      makeHTML(makeReduxState(addonWithoutVersion)),
    );
    const source = new SourceReduxStoreState(dom);
    expect(source.name()).toBe("Test Extension");
    expect(source.version()).toBeNull();
    expect(source.size()).toBeNull();
    expect(source.lastUpdated()).toBeNull();
  });

  it("should handle addon without ratings", () => {
    const addonNoRatings = { ...fullAddon, ratings: undefined };
    const dom = parseToDom(
      makeHTML(makeReduxState(addonNoRatings, fullVersion)),
    );
    const source = new SourceReduxStoreState(dom);
    expect(source.ratingValue()).toBeNull();
    expect(source.ratingCount()).toBeNull();
  });

  it("should handle addon without previews", () => {
    const addonNoPreviews = { ...fullAddon, previews: undefined };
    const dom = parseToDom(
      makeHTML(makeReduxState(addonNoPreviews, fullVersion)),
    );
    const source = new SourceReduxStoreState(dom);
    expect(source.image()).toBeNull();
  });

  it("should handle empty redux store state", () => {
    const dom = parseToDom(
      makeHTML({ addons: { byID: {} } }),
    );
    const source = new SourceReduxStoreState(dom);
    expect(source.name()).toBeNull();
  });
});
