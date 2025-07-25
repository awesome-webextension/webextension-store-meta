import { load } from "cheerio";
import { fetch, type RequestInit } from "undici";
import { describe, expect, it, type MockedFunction, vi } from "vitest";
import { fetchText } from "../../utils/fetch-text";
import { Amo } from "../";
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

        expect(amo.sourceDOM.name()).toEqual(expect.any(String));
        expect(amo.sourceDOM.description()).toEqual(expect.any(String));
        expect(amo.sourceDOM.ratingValue()).toEqual(expect.any(Number));
        expect(amo.sourceDOM.ratingCount()).toEqual(expect.any(Number));
        expect(amo.sourceDOM.users()).toEqual(expect.any(Number));
        expect(amo.sourceDOM.version()).toEqual(expect.any(String));
        expect(amo.sourceDOM.url()).toEqual(expect.any(String));
        expect(amo.sourceDOM.image()).toEqual(expect.any(String));
        expect(amo.sourceDOM.size()).toEqual(expect.any(String));
        expect(amo.sourceDOM.lastUpdated()).toEqual(expect.any(String));

        expect(amo.sourceJSONLD.name()).toEqual(expect.any(String));
        expect(amo.sourceJSONLD.description()).toEqual(expect.any(String));
        expect(amo.sourceJSONLD.ratingValue()).toEqual(expect.any(Number));
        expect(amo.sourceJSONLD.ratingCount()).toEqual(expect.any(Number));
        expect(amo.sourceJSONLD.price()).toEqual(expect.any(Number));
        expect(amo.sourceJSONLD.priceCurrency()).toEqual(expect.any(String));
        expect(amo.sourceJSONLD.version()).toEqual(expect.any(String));
        expect(amo.sourceJSONLD.url()).toEqual(expect.any(String));
        expect(amo.sourceJSONLD.image()).toEqual(expect.any(String));
        expect(amo.sourceJSONLD.operatingSystem()).toEqual(expect.any(String));

        expect(amo.sourceReduxStoreState.name()).toEqual(expect.any(String));
        expect(amo.sourceReduxStoreState.description()).toEqual(
          expect.any(String),
        );
        expect(amo.sourceReduxStoreState.ratingValue()).toEqual(
          expect.any(Number),
        );
        expect(amo.sourceReduxStoreState.ratingCount()).toEqual(
          expect.any(Number),
        );
        expect(amo.sourceReduxStoreState.users()).toEqual(expect.any(Number));
        expect(amo.sourceReduxStoreState.version()).toEqual(expect.any(String));
        expect(amo.sourceReduxStoreState.url()).toEqual(expect.any(String));
        expect(amo.sourceReduxStoreState.image()).toEqual(expect.any(String));
        expect(amo.sourceReduxStoreState.size()).toEqual(expect.any(String));
        expect(amo.sourceReduxStoreState.lastUpdated()).toEqual(
          expect.any(String),
        );

        expect(amo.sourceOG.description()).toEqual(expect.any(String));
        expect(amo.sourceOG.url()).toEqual(expect.any(String));
        expect(amo.sourceOG.image()).toEqual(expect.any(String));
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
