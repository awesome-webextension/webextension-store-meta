import { fetch } from "undici";
import { describe, expect, it, type MockedFunction, vi } from "vitest";
import { fetchText } from "../../utils/fetch-text";
import { ChromeWebStore } from "../";

const fetchTextMock = fetchText as MockedFunction<typeof fetchText>;

vi.mock("../../utils/fetch-text", () => {
  const cache = new Map<string, string>();
  return {
    fetchText: vi.fn(async (url, options) => {
      if (cache.has(url)) {
        return cache.get(url);
      }
      const result = await fetch(url, options).then((res) => res.text());
      cache.set(url, result);
      return result;
    }),
  };
});

describe("Chrome Web Store", async () => {
  it("should extract og", async () => {
    const og = {
      type: "website",
      url: "https://example.com/detail/url",
      title: "title",
      image: "https://example.com/image.jpg",
      description: "description",
    };

    fetchTextMock.mockResolvedValueOnce(`
      <!DOCTYPE html>
      <html>
        <head>
          <link rel="canonical" href="${og.url}"></link>
          ${Object.entries(og).map(
            ([property, value]) =>
              `<meta property="og:${property}" content="${value}"/>`,
          )}
        </head>
      </html>
    `);

    const chromeWebStore = await ChromeWebStore.load({ id: "xxx" });
    expect(chromeWebStore.meta()).toMatchObject({
      name: og.title,
      description: og.description,
      url: og.url,
      image: og.image,
      users: null,
      ratingValue: null,
      ratingCount: null,
      version: null,
      size: null,
      lastUpdated: null,
    });
  });

  it("should concat querystring", async () => {
    fetchTextMock.mockResolvedValueOnce(`
      <!DOCTYPE html>
      <html>
        <head>
          <link rel="canonical" href="https://example.com/detail/url"></link>
        </head>
      </html>
    `);

    await ChromeWebStore.load({
      id: "xxx",
      qs: { hl: "zh", lr: "lang_zh-CN" },
    });

    expect(fetchTextMock).toHaveBeenLastCalledWith(
      expect.stringContaining("?hl=zh&lr=lang_zh-CN"),
      undefined,
    );
  });

  it("should throw error if document is not loaded", () => {
    const chromeWebStore = new ChromeWebStore({ id: "xxx" });
    expect(() => chromeWebStore.meta()).toThrow();
  });

  it("should get null if extension not found", async () => {
    fetchTextMock.mockResolvedValueOnce(`
      <!DOCTYPE html>
      <html>
        <head>
          <link rel="canonical" href="https://example.com/not-found"></link>
        </head>
      </html>
    `);

    const chromeWebStore = await ChromeWebStore.load({ id: "xxxx" });
    expect(chromeWebStore.meta()).toMatchObject({
      name: null,
      description: null,
      url: null,
      image: null,
      ratingValue: null,
      ratingCount: null,
      users: null,
      version: null,
      size: null,
      lastUpdated: null,
    });
  });
});
