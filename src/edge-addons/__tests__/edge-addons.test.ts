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
import { EdgeAddons } from "..";
import { SourceAPI, type EdgeAddonsApiData } from "../SourceAPI";
import { SourceDOM } from "../SourceDOM";
import type { EdgeAddonsImage } from "../types";

vi.mock("../../utils/fetch-text", () => ({
  fetchText: vi.fn(),
}));

const fetchTextMock = fetchText as MockedFunction<typeof fetchText>;

const parseDOM = (html: string) => {
  const handler = new DomHandler();
  new Parser(handler).end(html);
  return handler.dom;
};

const EDGE_ID = "cnlefmmeadmemmdciolhbnfeacpdfbkd";
const DETAIL_URL = `https://microsoftedge.microsoft.com/addons/detail/${EDGE_ID}`;

const API_DATA: EdgeAddonsApiData = {
  availability: ["Public"],
  activeInstallCount: 1234,
  storeProductId: "store-product-id",
  name: "API Extension",
  logoUrl: "//store-images.example/logo.png",
  thumbnailUrl: "https://store-images.example/thumb.png",
  description: "API description",
  developer: "Developer",
  category: "Productivity",
  isInstalled: false,
  crxId: EDGE_ID,
  manifest: '{"version":"1.0.0"}',
  isHavingMatureContent: false,
  version: "1.0.0",
  lastUpdateDate: 1700000000,
  privacyUrl: "https://example.com/privacy",
  availabilityId: "availability-id",
  skuId: "sku-id",
  locale: "en-US",
  market: "US",
  averageRating: 4.6,
  ratingCount: 42,
  availableLanguages: ["en-US", "zh-CN"],
  metadata: { key: "value" },
  shortDescription: "Short description",
  searchKeywords: "keyword",
  screenshots: [{ uri: "//store-images.example/screenshot.png" }],
  videos: [{ uri: "https://store-images.example/video.png" }],
  largePromotionImage: { uri: "//store-images.example/large.png" },
  publisherWebsiteUri: "https://example.com",
  isBadgedAsFeatured: true,
  privacyData: { privacyPolicyRequired: true },
};

const DETAIL_HTML = `
  <!doctype html>
  <html>
    <head>
      <title>Fallback Extension - Microsoft Edge Add-ons</title>
    </head>
    <body>
      <span itemprop="interactionStatistic" itemscope itemtype="http://schema.org/InteractionCounter">
        <meta itemprop="userInteractionCount" content="1,234">
      </span>
      <span itemprop="aggregateRating" itemscope itemtype="http://schema.org/AggregateRating">
        <meta itemprop="ratingValue" content="4.5">
        <meta itemprop="ratingCount" content="67">
      </span>
    </body>
  </html>
`;

describe("Edge Add-ons", () => {
  beforeEach(() => {
    fetchTextMock.mockReset();
  });

  it("loads full meta from API data", async () => {
    fetchTextMock.mockResolvedValueOnce(JSON.stringify(API_DATA));

    const edgeAddons = await EdgeAddons.load({ id: EDGE_ID });

    expect(fetchTextMock).toHaveBeenCalledWith(
      `https://microsoftedge.microsoft.com/addons/getproductdetailsbycrxid/${EDGE_ID}`,
      undefined,
    );
    expect(edgeAddons.meta()).toEqual({
      ...API_DATA,
      logoUrl: "https://store-images.example/logo.png",
      screenshots: [{ uri: "https://store-images.example/screenshot.png" }],
      largePromotionImage: {
        uri: "https://store-images.example/large.png",
      },
      url: DETAIL_URL,
    });
    expect(edgeAddons.sourceAPI).toBe(edgeAddons.sourceAPI);
    expect(edgeAddons.sourceDOM).toBe(edgeAddons.sourceDOM);
  });

  it("keeps zero API numbers instead of falling back to DOM", async () => {
    fetchTextMock.mockResolvedValueOnce(
      JSON.stringify({
        ...API_DATA,
        activeInstallCount: 0,
        averageRating: 0,
        ratingCount: 0,
      }),
    );

    const edgeAddons = await EdgeAddons.load({ id: EDGE_ID });

    expect(edgeAddons.activeInstallCount()).toBe(0);
    expect(edgeAddons.averageRating()).toBe(0);
    expect(edgeAddons.ratingCount()).toBe(0);
  });

  it("concat querystring from objects and strings", async () => {
    fetchTextMock.mockResolvedValue(JSON.stringify(API_DATA));

    await EdgeAddons.load({
      id: EDGE_ID,
      qs: { hl: "zh", gl: "CN" },
    });
    await EdgeAddons.load({
      id: EDGE_ID,
      qs: "?hl=en",
    });

    expect(fetchTextMock).toHaveBeenNthCalledWith(
      1,
      `https://microsoftedge.microsoft.com/addons/getproductdetailsbycrxid/${EDGE_ID}?hl=zh&gl=CN`,
      undefined,
    );
    expect(fetchTextMock).toHaveBeenNthCalledWith(
      2,
      `https://microsoftedge.microsoft.com/addons/getproductdetailsbycrxid/${EDGE_ID}?hl=en`,
      undefined,
    );
  });

  it("falls back to detail page metadata when JSON endpoint fails", async () => {
    fetchTextMock
      .mockResolvedValueOnce("not json")
      .mockResolvedValueOnce(DETAIL_HTML);

    const edgeAddons = await EdgeAddons.load({ id: EDGE_ID });

    expect(edgeAddons.meta()).toMatchObject({
      activeInstallCount: 1234,
      name: "Fallback Extension",
      averageRating: 4.5,
      ratingCount: 67,
      url: DETAIL_URL,
    });
    expect(fetchTextMock).toHaveBeenLastCalledWith(DETAIL_URL, undefined);
  });

  it("returns nulls if API and detail page both fail", async () => {
    fetchTextMock.mockRejectedValue(new Error("404 Not Found"));

    const edgeAddons = await EdgeAddons.load({ id: EDGE_ID });

    expect(edgeAddons.meta()).toMatchObject({
      activeInstallCount: null,
      name: null,
      logoUrl: null,
      averageRating: null,
      ratingCount: null,
      url: null,
    });
  });

  it("throws error if item is not loaded", () => {
    const edgeAddons = new EdgeAddons({ id: EDGE_ID });

    expect(() => edgeAddons.meta()).toThrow(
      "Item not loaded. Please run `await instance.load()` first.`",
    );
    expect(() => edgeAddons.sourceDOM.url()).toThrow(
      "Item not loaded. Please run `await instance.load()` first.`",
    );
  });
});

describe("Edge Add-ons sources", () => {
  it("normalizes valid API data", () => {
    const source = new SourceAPI(API_DATA);

    expect(source.availability()).toEqual(["Public"]);
    expect(source.activeInstallCount()).toBe(1234);
    expect(source.storeProductId()).toBe("store-product-id");
    expect(source.name()).toBe("API Extension");
    expect(source.logoUrl()).toBe("https://store-images.example/logo.png");
    expect(source.logoUrl()).toBe("https://store-images.example/logo.png");
    expect(source.thumbnailUrl()).toBe(
      "https://store-images.example/thumb.png",
    );
    expect(source.description()).toBe("API description");
    expect(source.developer()).toBe("Developer");
    expect(source.category()).toBe("Productivity");
    expect(source.isInstalled()).toBe(false);
    expect(source.crxId()).toBe(EDGE_ID);
    expect(source.manifest()).toBe('{"version":"1.0.0"}');
    expect(source.isHavingMatureContent()).toBe(false);
    expect(source.version()).toBe("1.0.0");
    expect(source.lastUpdateDate()).toBe(1700000000);
    expect(source.privacyUrl()).toBe("https://example.com/privacy");
    expect(source.availabilityId()).toBe("availability-id");
    expect(source.skuId()).toBe("sku-id");
    expect(source.locale()).toBe("en-US");
    expect(source.market()).toBe("US");
    expect(source.averageRating()).toBe(4.6);
    expect(source.ratingCount()).toBe(42);
    expect(source.availableLanguages()).toEqual(["en-US", "zh-CN"]);
    expect(source.metadata()).toEqual({ key: "value" });
    expect(source.shortDescription()).toBe("Short description");
    expect(source.searchKeywords()).toBe("keyword");
    expect(source.screenshots()).toEqual([
      { uri: "https://store-images.example/screenshot.png" },
    ]);
    expect(source.videos()).toEqual([
      { uri: "https://store-images.example/video.png" },
    ]);
    expect(source.largePromotionImage()).toEqual({
      uri: "https://store-images.example/large.png",
    });
    expect(source.publisherWebsiteUri()).toBe("https://example.com");
    expect(source.isBadgedAsFeatured()).toBe(true);
    expect(source.privacyData()).toEqual({ privacyPolicyRequired: true });
  });

  it("returns nulls for invalid API data", () => {
    const source = new SourceAPI({
      availability: ["Public", 1] as unknown as string[],
      activeInstallCount: "123" as unknown as number,
      storeProductId: "",
      name: 1 as unknown as string,
      logoUrl: "",
      thumbnailUrl: 1 as unknown as string,
      isInstalled: "false" as unknown as boolean,
      availableLanguages: "en-US" as unknown as string[],
      metadata: [] as unknown as Record<string, unknown>,
      screenshots: "bad" as unknown as [],
      videos: [{ uri: 1 }, "bad"] as unknown as [],
      largePromotionImage: [] as unknown as EdgeAddonsImage,
      privacyData: null as unknown as Record<string, unknown>,
    });

    expect(source.availability()).toBeNull();
    expect(source.activeInstallCount()).toBeNull();
    expect(source.storeProductId()).toBeNull();
    expect(source.name()).toBeNull();
    expect(source.logoUrl()).toBeNull();
    expect(source.thumbnailUrl()).toBeNull();
    expect(source.isInstalled()).toBeNull();
    expect(source.availableLanguages()).toBeNull();
    expect(source.metadata()).toBeNull();
    expect(source.screenshots()).toBeNull();
    expect(source.videos()).toEqual([{ uri: 1 }]);
    expect(source.largePromotionImage()).toBeNull();
    expect(source.privacyData()).toBeNull();
  });

  it("handles incomplete detail DOM", () => {
    const source = new SourceDOM(
      parseDOM(`
        <!doctype html>
        <html>
          <head><title>Microsoft Edge Add-ons</title></head>
          <body>
            <meta itemprop="userInteractionCount" content="bad">
          </body>
        </html>
      `),
      null,
    );

    expect(source.name()).toBe("Microsoft Edge Add-ons");
    expect(source.activeInstallCount()).toBeNull();
    expect(source.averageRating()).toBeNull();
    expect(source.ratingCount()).toBeNull();
    expect(source.url()).toBeNull();
  });
});
