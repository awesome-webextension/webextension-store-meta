import { DomHandler } from "domhandler";
import { Parser } from "htmlparser2/lib/Parser";
import {
  beforeEach,
  describe,
  expect,
  it,
  type MockedFunction,
  vi,
} from "vitest";
import { fetchText } from "../../utils/fetch-text";
import { Amo, type AmoOptions } from "../";
import { SourceDOM } from "../SourceDOM";
import { SourceJSONLD } from "../SourceJSONLD";
import { SourceOG } from "../SourceOG";
import { SourceReduxStoreState } from "../SourceReduxStoreState";
import { parseRattingValue } from "../utils";

vi.mock("../../utils/fetch-text", () => ({
  fetchText: vi.fn(),
}));

const fetchTextMock = fetchText as MockedFunction<typeof fetchText>;

const parseDOM = (html: string) => {
  const handler = new DomHandler();
  new Parser(handler).end(html);
  return handler.dom;
};

const REDUX_HTML = `
  <!doctype html>
  <html>
    <head>
      <script id="redux-store-state">
        {
          "addons": {
            "byID": {
              "addon-1": {
                "name": "Redux Add-on",
                "description": "Redux description",
                "ratings": { "average": "4.8", "count": "1,234" },
                "average_daily_users": "12,345",
                "currentVersionId": "version-1",
                "url": "https://addons.mozilla.org/firefox/addon/redux-addon/",
                "previews": [{ "src": "https://example.com/redux.png" }]
              }
            }
          },
          "versions": {
            "byId": {
              "version-1": {
                "version": "v1.2.3",
                "file": {
                  "size": 1048576,
                  "created": "2024-01-01"
                }
              }
            }
          }
        }
      </script>
      <script type="application/ld+json">
        {
          "offers": { "price": "0", "priceCurrency": "USD" },
          "operatingSystem": "Firefox"
        }
      </script>
    </head>
  </html>
`;

const JSON_LD_HTML = `
  <!doctype html>
  <html>
    <head>
      <script type="application/ld+json">
        {
          "name": "JSON-LD Add-on",
          "description": "JSON-LD description",
          "aggregateRating": { "ratingValue": "4.5", "ratingCount": "99" },
          "offers": { "price": "2.99", "priceCurrency": "EUR" },
          "version": "version 2.3.4",
          "url": "https://example.com/json-ld",
          "image": "https://example.com/json-ld.png",
          "operatingSystem": "Firefox"
        }
      </script>
    </head>
  </html>
`;

const OG_HTML = `
  <!doctype html>
  <html>
    <head>
      <meta property="og:description" content="OG description">
      <meta property="og:url" content="https://example.com/og">
      <meta property="og:image" content="https://example.com/og.png">
    </head>
  </html>
`;

const DOM_HTML = `
  <!doctype html>
  <html>
    <head>
      <link rel="canonical" href="https://addons.mozilla.org/firefox/addon/dom-addon/">
    </head>
    <body>
      <div class="AddonTitle"><h1>DOM Add-on</h1></div>
      <div class="Addon-summary">DOM summary</div>
      <div class="AddonBadges">
        <span data-testid="badge-star-rating">4.2 (321)</span>
        <span data-testid="badge-user-count">1,000 users</span>
      </div>
      <div class="AddonMoreInfo-version">Version 3.4.5</div>
      <img class="ScreenShots-image" src="https://example.com/dom.png">
      <div class="AddonMoreInfo-filesize">2 MB</div>
      <div class="AddonMoreInfo-last-updated">2024-02-01</div>
    </body>
  </html>
`;

describe("Amo", () => {
  beforeEach(() => {
    fetchTextMock.mockReset();
  });

  it("loads full meta from Redux state and JSON-LD", async () => {
    const options = { headers: { "User-Agent": "Test" } };
    fetchTextMock.mockResolvedValueOnce(REDUX_HTML);

    const amo = new Amo({ id: "redux-addon", options });
    await amo.load();

    expect(fetchTextMock).toHaveBeenCalledWith(
      "https://addons.mozilla.org/firefox/addon/redux-addon",
      options,
    );
    expect(amo.meta()).toMatchObject({
      name: "Redux Add-on",
      description: "Redux description",
      ratingValue: 4.8,
      ratingCount: 1234,
      users: 12345,
      price: 0,
      priceCurrency: "USD",
      version: "1.2.3",
      url: "https://addons.mozilla.org/firefox/addon/redux-addon/",
      image: "https://example.com/redux.png",
      operatingSystem: "Firefox",
      size: expect.any(String),
      lastUpdated: "2024-01-01",
    });
    expect(amo.sourceDOM).toBe(amo.sourceDOM);
    expect(amo.sourceJSONLD).toBe(amo.sourceJSONLD);
    expect(amo.sourceOG).toBe(amo.sourceOG);
    expect(amo.sourceReduxStoreState).toBe(amo.sourceReduxStoreState);
  });

  it("also loads with static shortcut, locale, and querystring", async () => {
    fetchTextMock.mockResolvedValueOnce(DOM_HTML);

    const amo = await Amo.load({
      id: "dom-addon",
      locale: "zh-CN",
      qs: "?utm=test",
    });

    expect(amo.meta()).toMatchObject({
      name: "DOM Add-on",
      description: "DOM summary",
      ratingValue: 4.2,
      ratingCount: 321,
      users: 1000,
      version: "3.4.5",
      url: "https://addons.mozilla.org/firefox/addon/dom-addon/",
      image: "https://example.com/dom.png",
      size: "2 MB",
      lastUpdated: "2024-02-01",
    });
    expect(fetchTextMock).toHaveBeenLastCalledWith(
      "https://addons.mozilla.org/zh-CN/firefox/addon/dom-addon?utm=test",
      undefined,
    );
  });

  it("serializes object querystrings", async () => {
    fetchTextMock.mockResolvedValueOnce(DOM_HTML);

    await Amo.load({
      id: "dom-addon",
      qs: { hl: "zh", lr: "lang_zh-CN" },
    });

    expect(fetchTextMock).toHaveBeenLastCalledWith(
      "https://addons.mozilla.org/firefox/addon/dom-addon?hl=zh&lr=lang_zh-CN",
      undefined,
    );
  });

  it("throws error if document is not loaded", () => {
    const amo = new Amo({ id: "missing" });
    expect(() => amo.meta()).toThrow(
      "Item not loaded. Please run `await instance.load()` first.`",
    );
  });

  it("accepts a missing config defensively", () => {
    expect(new Amo(undefined as unknown as AmoOptions).config).toEqual({});
  });

  it("falls back to JSON-LD source", async () => {
    fetchTextMock.mockResolvedValueOnce(JSON_LD_HTML);

    const amo = await Amo.load({ id: "json-ld-addon" });

    expect(amo.meta()).toMatchObject({
      name: "JSON-LD Add-on",
      description: "JSON-LD description",
      ratingValue: 4.5,
      ratingCount: 99,
      price: 2.99,
      priceCurrency: "EUR",
      version: "2.3.4",
      url: "https://example.com/json-ld",
      image: "https://example.com/json-ld.png",
      operatingSystem: "Firefox",
    });
  });

  it("falls back to Open Graph source for supported fields", async () => {
    fetchTextMock.mockResolvedValueOnce(OG_HTML);

    const amo = await Amo.load({ id: "og-addon" });

    expect(amo.description()).toBe("OG description");
    expect(amo.url()).toBe("https://example.com/og");
    expect(amo.image()).toBe("https://example.com/og.png");
  });
});

describe("AMO sources", () => {
  it("returns nulls from empty DOM source", () => {
    const source = new SourceDOM(parseDOM(""));

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

  it("uses long description when summary is missing", () => {
    const source = new SourceDOM(
      parseDOM('<div class="Description">Long description</div>'),
    );

    expect(source.description()).toBe("Long description");
  });

  it("returns null for an empty title element", () => {
    const source = new SourceDOM(parseDOM('<div class="AddonTitle"></div>'));

    expect(source.name()).toBeNull();
  });

  it("handles incomplete DOM badges", () => {
    const noMatchingBadges = new SourceDOM(
      parseDOM(
        '<div class="AddonBadges"><span data-testid="other">n/a</span></div>',
      ),
    );
    const noRatingCount = new SourceDOM(
      parseDOM(
        '<div class="AddonBadges"><span data-testid="badge-star-rating">4.2</span></div>',
      ),
    );

    expect(noMatchingBadges.ratingValue()).toBeNull();
    expect(noMatchingBadges.ratingCount()).toBeNull();
    expect(noMatchingBadges.users()).toBeNull();
    expect(noRatingCount.ratingValue()).toBe(4.2);
    expect(noRatingCount.ratingCount()).toBeNull();
  });

  it("returns nulls from missing or invalid JSON-LD", () => {
    const empty = new SourceJSONLD(parseDOM(""));
    const invalid = new SourceJSONLD(
      parseDOM('<script type="application/ld+json">{</script>'),
    );

    expect(empty.name()).toBeNull();
    expect(invalid.description()).toBeNull();
    expect(invalid.ratingValue()).toBeNull();
    expect(invalid.ratingCount()).toBeNull();
    expect(invalid.price()).toBeNull();
    expect(invalid.priceCurrency()).toBeNull();
    expect(invalid.version()).toBeNull();
    expect(invalid.url()).toBeNull();
    expect(invalid.image()).toBeNull();
    expect(invalid.operatingSystem()).toBeNull();
  });

  it("returns null from Open Graph tags without content", () => {
    const source = new SourceOG(parseDOM('<meta property="og:image">'));

    expect(source.description()).toBeNull();
    expect(source.url()).toBeNull();
    expect(source.image()).toBeNull();
  });

  it("handles incomplete Redux state", () => {
    const noScript = new SourceReduxStoreState(parseDOM(""));
    const noAddons = new SourceReduxStoreState(
      parseDOM('<script id="redux-store-state">{"addons":{}}</script>'),
    );
    const noVersionId = new SourceReduxStoreState(
      parseDOM(`
        <script id="redux-store-state">
          {
            "addons": {
              "byID": {
                "addon": {
                  "currentVersionId": {},
                  "ratings": { "average": 6, "count": "bad" },
                  "previews": [{}]
                }
              }
            }
          }
        </script>
      `),
    );
    const zeroSize = new SourceReduxStoreState(
      parseDOM(`
        <script id="redux-store-state">
          {
            "addons": {
              "byID": {
                "addon": { "currentVersionId": 1 }
              }
            },
            "versions": {
              "byId": {
                "1": { "version": "v1.0.0", "file": { "size": 0 } }
              }
            }
          }
        </script>
      `),
    );

    expect(noScript.name()).toBeNull();
    expect(noAddons.name()).toBeNull();
    expect(noVersionId.ratingValue()).toBeNull();
    expect(noVersionId.ratingCount()).toBeNull();
    expect(noVersionId.image()).toBeNull();
    expect(noVersionId.size()).toBeNull();
    expect(noVersionId.lastUpdated()).toBeNull();
    expect(zeroSize.version()).toBe("1.0.0");
    expect(zeroSize.size()).toBeNull();
  });

  it("parses AMO rating values in the accepted range", () => {
    expect(parseRattingValue(0)).toBe(0);
    expect(parseRattingValue(5)).toBe(5);
    expect(parseRattingValue(-1)).toBeNull();
    expect(parseRattingValue(6)).toBeNull();
    expect(parseRattingValue("bad")).toBeNull();
  });
});
