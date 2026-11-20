import { describe, expect, it } from "vitest";
import { ChromeWebStore } from "../";
import { parseMetricsFromDOM } from "../parse-metrics";
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

  describe.each(await fixtures())("%s", (id) => {
    it.each([
      ["default", undefined],
      ["Chinese", { hl: "zh", lr: "lang_zh-CN" }],
    ] as const)(
      "reads metadata with the %s locale",
      async (_, qs) => {
        const item = await ChromeWebStore.load({ id, qs });

        expect({
          ...parseMetricsFromDOM(item.dom, id),
          name: item.name(),
          description: item.description(),
          version: item.version(),
          url: item.url(),
          image: item.image(),
          size: item.size(),
          lastUpdated: item.lastUpdated(),
        }).toMatchObject(matchAnyInfo);
      },
      20000,
    );
  });
});
