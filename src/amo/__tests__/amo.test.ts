import { load } from "cheerio";
import { type RequestInit, fetch } from "undici";
import { type MockedFunction, describe, expect, it, vi } from "vitest";
import { Amo } from "../";
import { fetchText } from "../../utils/fetch-text";
import { fixtures } from "./fixtures";

const fetchTextMock = fetchText as MockedFunction<typeof fetchText>;

vi.mock("../../utils/fetch-text", () => {
  const cache = new Map<string, string>();
  return {
    fetchText: vi.fn(async (url, options): Promise<string> => {
      if (cache.has(url)) {
        return cache.get(url) || "";
      }
      const result = await fetch(url, options).then((res) => res.text());
      cache.set(url, result);
      return result;
    }),
  };
});

describe("Amo", async () => {
  it("should extract itemprop schema", async () => {
    const schema = {
      "@context": "http://schema.org",
      "@type": "WebApplication",
      applicationCategory: "http://schema.org/OtherApplication",
      name: "name",
      description: "description",
      url: "https://example.com/url",
      image: "https://example.com/image.jpg",
      operatingSystem: "Firefox",
      offers: {
        "@type": "Offer",
        availability: "http://schema.org/InStock",
        price: 404,
        priceCurrency: "USD",
      },
      version: "1.2.3",
      aggregateRating: {
        "@type": "AggregateRating",
        ratingCount: 202,
        ratingValue: 3.8,
      },
    };

    fetchTextMock.mockResolvedValueOnce(`
      <!DOCTYPE html>
      <html>
        <head>
          <script data-react-helmet="true" type="application/ld+json">
          ${JSON.stringify(schema)}
          </script>
        </head>
      </html>
    `);

    const amo = await Amo.load({ id: "xxx" });
    expect(amo.meta()).toMatchObject({
      users: null,
      name: schema.name,
      description: schema.description,
      ratingValue: schema.aggregateRating.ratingValue,
      ratingCount: schema.aggregateRating.ratingCount,
      price: schema.offers.price,
      priceCurrency: schema.offers.priceCurrency,
      version: schema.version,
      url: schema.url,
      image: schema.image,
      operatingSystem: schema.operatingSystem,
    });
  });

  it("should extract og", async () => {
    const og = {
      type: "website",
      url: "https://example.com/url",
      title: "title",
      locale: "en-US",
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

    const amo = await Amo.load({ id: "xxx" });
    expect(amo.meta()).toMatchObject({
      name: og.title,
      description: og.description,
      url: og.url,
      image: og.image,
      users: null,
      ratingValue: null,
      ratingCount: null,
      price: null,
      priceCurrency: null,
      version: null,
      operatingSystem: null,
      size: null,
      lastUpdated: null,
    });
  });

  const matchAnyInfo = {
    name: expect.any(String),
    description: expect.any(String),
    ratingValue: expect.any(Number),
    ratingCount: expect.any(Number),
    users: expect.any(Number),
    price: expect.any(Number),
    priceCurrency: expect.any(String),
    version: expect.any(String),
    url: expect.any(String),
    image: expect.any(String),
    operatingSystem: expect.any(String),
    size: expect.any(String),
    lastUpdated: expect.any(String),
  };

  describe.each(await fixtures())(
    "%s",
    (extId) => {
      it("should return ext info", async () => {
        const amo = new Amo({ id: extId });
        await amo.load();
        expect(amo.meta()).toMatchObject(matchAnyInfo);
      });

      it("should also return ext info with static `load` shortcut", async () => {
        const amo = await Amo.load({ id: extId });
        expect(amo.meta()).toMatchObject(matchAnyInfo);
      });

      it("should concat querystring", async () => {
        const amo = await Amo.load({
          id: extId,
          qs: { hl: "zh", lr: "lang_zh-CN" },
        });
        expect(amo.meta()).toMatchObject(matchAnyInfo);
        expect(fetchTextMock).toHaveBeenLastCalledWith(
          expect.stringContaining("?hl=zh&lr=lang_zh-CN"),
          undefined,
        );
      });

      it("should throw error if document is not loaded", () => {
        const amo = new Amo({ id: extId });
        expect(() => amo.meta()).toThrow();
      });

      it("should extract from elements", async () => {
        const cache = new Map<string, string>();
        fetchTextMock.mockImplementationOnce(
          async (url: string, options?: RequestInit): Promise<string> => {
            const result: string =
              cache.get(url) ||
              (await fetch(url, options).then((res) => res.text()));
            const $ = load(result);
            $("[itemprop]").remove();
            $("[property]").remove();
            $('script[type="application/ld+json"]').remove();

            cache.set(url, $.html());
            return result;
          },
        );

        const amo = await Amo.load({ id: "ublock-origin" });
        expect(amo.meta()).toMatchObject({
          name: expect.any(String),
          description: expect.any(String),
          url: expect.any(String),
          version: expect.any(String),
          users: expect.any(Number),
          ratingValue: expect.any(Number),
          ratingCount: expect.any(Number),
          image: expect.any(String),
          operatingSystem: expect.any(String),
          price: expect.any(Number),
          priceCurrency: expect.any(String),
        });
      });
    },
    20000,
  );
});
