import { fetch } from "undici";
import { describe, expect, it, type MockedFunction, vi } from "vitest";
import { fetchText } from "../../utils/fetch-text";
import { EdgeAddons } from "..";
import { fixtures } from "./fixtures";

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

describe("Edge Add-ons", async () => {
  const matchAnyInfo = {
    availability: expect.any(Array),
    activeInstallCount: expect.any(Number),
    storeProductId: expect.any(String),
    name: expect.any(String),
    logoUrl: expect.stringMatching(/^https:\/\//),
    description: expect.any(String),
    developer: expect.any(String),
    category: expect.any(String),
    isInstalled: expect.any(Boolean),
    crxId: expect.any(String),
    manifest: expect.any(String),
    isHavingMatureContent: expect.any(Boolean),
    version: expect.any(String),
    lastUpdateDate: expect.any(Number),
    privacyUrl: expect.any(String),
    availabilityId: expect.any(String),
    skuId: expect.any(String),
    locale: expect.any(String),
    market: expect.any(String),
    averageRating: expect.any(Number),
    ratingCount: expect.any(Number),
    availableLanguages: expect.any(Array),
    metadata: expect.any(Object),
    shortDescription: expect.any(String),
    searchKeywords: expect.any(String),
    screenshots: expect.any(Array),
    videos: expect.any(Array),
    publisherWebsiteUri: expect.any(String),
    isBadgedAsFeatured: expect.any(Boolean),
    url: expect.stringMatching(
      /^https:\/\/microsoftedge\.microsoft\.com\/addons\/detail\//,
    ),
  };

  describe.each(await fixtures())("%s", (id) => {
    it("should return ext info", async () => {
      const edgeAddons = new EdgeAddons({ id });
      await edgeAddons.load();
      expect(edgeAddons.meta()).toMatchObject({
        ...matchAnyInfo,
        crxId: id,
      });
    });

    it("should also return ext info with static `load` shortcut", async () => {
      const edgeAddons = await EdgeAddons.load({ id });
      expect(edgeAddons.meta()).toMatchObject({
        ...matchAnyInfo,
        crxId: id,
      });
    });

    it("should concat querystring", async () => {
      const edgeAddons = await EdgeAddons.load({
        id,
        qs: { hl: "zh", gl: "CN" },
      });
      expect(edgeAddons.meta()).toMatchObject({
        ...matchAnyInfo,
        crxId: id,
      });
      expect(fetchTextMock).toHaveBeenLastCalledWith(
        expect.stringContaining("?hl=zh&gl=CN"),
        undefined,
      );
    });

    it("should throw error if item is not loaded", () => {
      const edgeAddons = new EdgeAddons({ id });
      expect(() => edgeAddons.meta()).toThrow();
    });
  }, 20000);

  it("should fall back to detail page metadata when JSON endpoint fails", async () => {
    fetchTextMock
      .mockRejectedValueOnce(new Error("JSON endpoint unavailable"))
      .mockResolvedValueOnce(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Fallback Extension - Microsoft Edge Add-ons</title>
          </head>
          <body>
            <div itemscope itemtype="http://schema.org/WebApplication">
              <span itemprop="interactionStatistic" itemscope itemtype="http://schema.org/InteractionCounter">
                <meta itemprop="userInteractionCount" content="1,234" />
              </span>
            </div>
            <span itemprop="aggregateRating" itemscope itemtype="http://schema.org/AggregateRating">
              <meta itemprop="ratingValue" content="4.5" />
              <meta itemprop="ratingCount" content="67" />
            </span>
          </body>
        </html>
      `);

    const edgeAddons = await EdgeAddons.load({ id: "fallback-id" });

    expect(edgeAddons.meta()).toMatchObject({
      name: "Fallback Extension",
      activeInstallCount: 1234,
      averageRating: 4.5,
      ratingCount: 67,
      url: "https://microsoftedge.microsoft.com/addons/detail/fallback-id",
    });
  });

  it("should get null if extension is not found", async () => {
    fetchTextMock.mockRejectedValue(new Error("404 Not Found"));

    const edgeAddons = await EdgeAddons.load({
      id: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    });

    expect(edgeAddons.meta()).toMatchObject({
      activeInstallCount: null,
      name: null,
      logoUrl: null,
      averageRating: null,
      ratingCount: null,
      url: null,
    });
  });
});
