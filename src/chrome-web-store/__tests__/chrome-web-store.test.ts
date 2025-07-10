import { fetch } from "undici";
import { type MockedFunction, describe, expect, it, vi } from "vitest";
import { ChromeWebStore } from "../";
import { fetchText } from "../../utils/fetch-text";
import { fixtures } from "./fixtures";
import process from "node:process";

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
    process.env.allowVersionFallback = "true";
    try {
      const og = {
        type: "website",
        url: "https://example.com/url",
        title: "title",
        image: "https://example.com/image.jpg",
        description: "description",
      };

      fetchTextMock.mockResolvedValueOnce(`
      <!DOCTYPE html>
      <html>
        <head>
          ${Object.entries(og).map(
          ([property, value]) =>
              `<meta property="og:${property}" content="${value}"/>`,
      )}
        </head>
      </html>
    `);

      const chromeWebStore = await ChromeWebStore.load({id: "xxx"});
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
    } finally {
      process.env.allowVersionFallback = undefined;
    }
  });

  const matchAnyInfo = {
    name: expect.any(String),
    description: expect.any(String),
    ratingValue: expect.any(String),
    ratingCount: expect.any(String),
    users: expect.any(String),
    version: expect.any(String),
    url: expect.any(String),
    image: expect.any(String),
    size: expect.any(String),
    lastUpdated: expect.any(String),
  };

  describe.each(await fixtures())(
    "%s",
    (id) => {
      it("should return ext info", async () => {
        const chromeWebStore = new ChromeWebStore({ id });
        await chromeWebStore.load();
        expect(chromeWebStore.meta()).toMatchObject(matchAnyInfo);
      });

      it("should also return ext info with static `load` shortcut", async () => {
        const chromeWebStore = await ChromeWebStore.load({ id });
        expect(chromeWebStore.meta()).toMatchObject(matchAnyInfo);
      });

      it("should concat querystring", async () => {
        const chromeWebStore = await ChromeWebStore.load({
          id,
          qs: { hl: "zh", lr: "lang_zh-CN" },
        });
        expect(chromeWebStore.meta()).toMatchObject(matchAnyInfo);
        expect(fetchTextMock).toHaveBeenLastCalledWith(
          expect.stringContaining("?hl=zh&lr=lang_zh-CN"),
          undefined,
        );
      });

      it("should throw error if document is not loaded", async () => {
        try {
          const chromeWebStore = new ChromeWebStore({ id });
          await chromeWebStore.load();
          const version = chromeWebStore.version();

          process.env.allowVersionFallback = "true";
          // @ts-ignore
          const versionFallback = chromeWebStore.versionFallback();
          expect(versionFallback).toBe(version);
        } finally {
          process.env.allowVersionFallback = undefined;
        }


      });

      it("should available versionFallback ", async () => {
        const chromeWebStore = new ChromeWebStore({ id });
        await chromeWebStore.load();
        expect(chromeWebStore.meta()).toMatchObject(matchAnyInfo);
      });
    },
    20000,
  );
});
