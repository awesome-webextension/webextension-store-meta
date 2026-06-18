import { describe, expect, it } from "vitest";
import { ChromeWebStore } from "../";
import { fixtures } from "./fixtures";

describe("Chrome Web Store health", async () => {
  const matchAnyInfo = {
    name: expect.any(String),
    description: expect.any(String),
    ratingValue: expect.any(Number),
    ratingCount: expect.any(Number),
    users: expect.any(Number),
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
        const chromeWebStore = await ChromeWebStore.load({ id });
        expect(chromeWebStore.meta()).toMatchObject(matchAnyInfo);
      });

      it("should concat querystring", async () => {
        const chromeWebStore = await ChromeWebStore.load({
          id,
          qs: { hl: "zh", lr: "lang_zh-CN" },
        });
        expect(chromeWebStore.meta()).toMatchObject(matchAnyInfo);
      });
    },
    20000,
  );
});
