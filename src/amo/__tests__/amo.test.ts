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
import { parseRattingValue } from "../utils";

vi.mock("../../utils/fetch-text", () => ({
  fetchText: vi.fn(),
}));

const fetchTextMock = fetchText as MockedFunction<typeof fetchText>;

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

describe("Amo", () => {
  beforeEach(() => {
    fetchTextMock.mockReset();
  });

  it("loads metadata with a single API request", async () => {
    const options = { headers: { "User-Agent": "Test" } };
    fetchTextMock.mockResolvedValueOnce(JSON.stringify(API_DATA));
    const amo = await Amo.load({ id: "api-addon", options });

    expect(fetchTextMock).toHaveBeenCalledTimes(1);
    expect(fetchTextMock).toHaveBeenCalledWith(
      "https://addons.mozilla.org/api/v5/addons/addon/api-addon/",
      options,
    );
    expect(amo.meta()).toEqual({
      name: "API Add-on",
      description: "API summary",
      ratingValue: 4.6,
      ratingCount: 42,
      users: 6789,
      price: null,
      priceCurrency: null,
      version: "9.8.7",
      url: "https://addons.mozilla.org/firefox/addon/api-addon/",
      image: "https://example.com/api.png",
      operatingSystem: null,
      size: "1 MB",
      lastUpdated: "2024-03-02T00:00:00Z",
    });
    expect(amo.sourceAPI).toBe(amo.sourceAPI);
  });

  it("uses API translations and ignores legacy page querystrings", async () => {
    fetchTextMock.mockResolvedValueOnce(JSON.stringify(API_DATA));
    const amo = await Amo.load({
      id: "api-addon",
      locale: "zh-CN",
      qs: "?utm=test",
    });

    expect(amo.name()).toBe("API Add-on zh");
    expect(fetchTextMock).toHaveBeenCalledTimes(1);
    expect(fetchTextMock).toHaveBeenCalledWith(
      "https://addons.mozilla.org/api/v5/addons/addon/api-addon/?lang=zh-CN",
      undefined,
    );
  });

  it("propagates API failures without requesting HTML", async () => {
    fetchTextMock.mockRejectedValueOnce(new Error("API down"));
    await expect(Amo.load({ id: "api-addon" })).rejects.toThrow("API down");
    expect(fetchTextMock).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid JSON without requesting HTML", async () => {
    fetchTextMock.mockResolvedValueOnce("<html>Client Challenge</html>");
    await expect(Amo.load({ id: "api-addon" })).rejects.toThrow(SyntaxError);
    expect(fetchTextMock).toHaveBeenCalledTimes(1);
  });

  it("refreshes metadata when reloaded", async () => {
    fetchTextMock
      .mockResolvedValueOnce(JSON.stringify(API_DATA))
      .mockResolvedValueOnce(JSON.stringify({ ...API_DATA, name: "Updated" }));
    const amo = await Amo.load({ id: "api-addon" });
    expect(amo.name()).toBe("API Add-on");
    await amo.load();
    expect(amo.name()).toBe("Updated");
  });

  it("throws error if item is not loaded", () => {
    expect(() => new Amo({ id: "missing" }).meta()).toThrow("Item not loaded.");
  });

  it("accepts a missing config defensively", () => {
    expect(new Amo(undefined as unknown as AmoOptions).config).toEqual({});
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

  it("parses AMO rating values in the accepted range", () => {
    expect(parseRattingValue(0)).toBe(0);
    expect(parseRattingValue(5)).toBe(5);
    expect(parseRattingValue(-1)).toBeNull();
    expect(parseRattingValue(6)).toBeNull();
    expect(parseRattingValue("bad")).toBeNull();
  });
});
