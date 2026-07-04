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
import { SourceAPI } from "../SourceAPI";
import { SourceDOM } from "../SourceDOM";
import { SourceJSONLD } from "../SourceJSONLD";
import { SourceOG } from "../SourceOG";
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

const API_DATA = {
  average_daily_users: "6,789",
  current_version: {
    file: {
      created: "2024-03-01T00:00:00Z",
      size: 1_000_000,
    },
    version: "v9.8.7",
  },
  default_locale: "en-US",
  description: {
    "en-US": "API long description",
    "zh-CN": "API long description zh",
  },
  icon_url: "https://example.com/api-icon.png",
  last_updated: "2024-03-02T00:00:00Z",
  name: {
    "en-US": "API Add-on",
    "zh-CN": "API Add-on zh",
  },
  previews: [
    {},
    {
      image_url: "https://example.com/api.png",
    },
  ],
  ratings: { average: "4.6", count: "42" },
  summary: {
    "en-US": "API summary",
    "zh-CN": "API summary zh",
  },
  url: "https://addons.mozilla.org/firefox/addon/api-addon/",
};

const API_FALLBACK_HTML = `
  <!doctype html>
  <html>
    <head>
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

  it("loads API source first and falls back to JSON-LD for remaining fields", async () => {
    const options = { headers: { "User-Agent": "Test" } };
    fetchTextMock
      .mockResolvedValueOnce(JSON.stringify(API_DATA))
      .mockResolvedValueOnce(API_FALLBACK_HTML);

    const amo = new Amo({ id: "api-addon", options });
    await amo.load();

    expect(fetchTextMock).toHaveBeenCalledWith(
      "https://addons.mozilla.org/api/v5/addons/addon/api-addon/",
      options,
    );
    expect(fetchTextMock).toHaveBeenCalledWith(
      "https://addons.mozilla.org/firefox/addon/api-addon",
      options,
    );
    expect(amo.meta()).toMatchObject({
      name: "API Add-on",
      description: "API summary",
      ratingValue: 4.6,
      ratingCount: 42,
      users: 6789,
      price: 0,
      priceCurrency: "USD",
      version: "9.8.7",
      url: "https://addons.mozilla.org/firefox/addon/api-addon/",
      image: "https://example.com/api.png",
      operatingSystem: "Firefox",
      size: expect.any(String),
      lastUpdated: "2024-03-02T00:00:00Z",
    });
    expect(amo.sourceAPI).toBe(amo.sourceAPI);
    expect(amo.sourceDOM).toBe(amo.sourceDOM);
    expect(amo.sourceJSONLD).toBe(amo.sourceJSONLD);
    expect(amo.sourceOG).toBe(amo.sourceOG);
  });

  it("also loads with static shortcut, locale, and querystring", async () => {
    fetchTextMock.mockResolvedValueOnce("{}").mockResolvedValueOnce(DOM_HTML);

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
    expect(fetchTextMock).toHaveBeenCalledWith(
      "https://addons.mozilla.org/api/v5/addons/addon/dom-addon/?lang=zh-CN",
      undefined,
    );
    expect(fetchTextMock).toHaveBeenLastCalledWith(
      "https://addons.mozilla.org/zh-CN/firefox/addon/dom-addon?utm=test",
      undefined,
    );
  });

  it("serializes object querystrings", async () => {
    fetchTextMock.mockResolvedValueOnce("{}").mockResolvedValueOnce(DOM_HTML);

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
    fetchTextMock
      .mockResolvedValueOnce("{}")
      .mockResolvedValueOnce(JSON_LD_HTML);

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
    fetchTextMock.mockResolvedValueOnce("{}").mockResolvedValueOnce(OG_HTML);

    const amo = await Amo.load({ id: "og-addon" });

    expect(amo.description()).toBe("OG description");
    expect(amo.url()).toBe("https://example.com/og");
    expect(amo.image()).toBe("https://example.com/og.png");
  });

  it("falls back to page sources when the API request fails", async () => {
    fetchTextMock
      .mockRejectedValueOnce(new Error("API down"))
      .mockResolvedValueOnce(DOM_HTML);

    const amo = await Amo.load({ id: "dom-addon" });

    expect(amo.name()).toBe("DOM Add-on");
    expect(amo.sourceAPI.name()).toBeNull();
    expect(fetchTextMock).toHaveBeenLastCalledWith(
      "https://addons.mozilla.org/firefox/addon/dom-addon",
      undefined,
    );
  });
});

describe("AMO sources", () => {
  it("reads AMO v5 API fields", () => {
    const source = new SourceAPI(API_DATA, "zh-CN");

    expect(source.name()).toBe("API Add-on zh");
    expect(source.description()).toBe("API summary zh");
    expect(source.ratingValue()).toBe(4.6);
    expect(source.ratingCount()).toBe(42);
    expect(source.users()).toBe(6789);
    expect(source.version()).toBe("9.8.7");
    expect(source.url()).toBe(
      "https://addons.mozilla.org/firefox/addon/api-addon/",
    );
    expect(source.image()).toBe("https://example.com/api.png");
    expect(source.size()).toBe("1 MB");
    expect(source.lastUpdated()).toBe("2024-03-02T00:00:00Z");
  });

  it("falls back through AMO v5 API translations", () => {
    expect(new SourceAPI(API_DATA, "fr").name()).toBe("API Add-on");
    expect(
      new SourceAPI({
        default_locale: "fr",
        name: { "en-US": "English name", fr: null },
      }).name(),
    ).toBe("English name");
  });

  it("returns nulls from incomplete AMO v5 API data", () => {
    const source = new SourceAPI({
      current_version: { file: { size: 0 } },
      previews: [{}],
      ratings: { average: 6, count: "bad" },
    });

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

  it("parses AMO rating values in the accepted range", () => {
    expect(parseRattingValue(0)).toBe(0);
    expect(parseRattingValue(5)).toBe(5);
    expect(parseRattingValue(-1)).toBeNull();
    expect(parseRattingValue(6)).toBeNull();
    expect(parseRattingValue("bad")).toBeNull();
  });
});
