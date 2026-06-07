import { fetch, type RequestInit } from "undici";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { EdgeAddons } from "..";
import { fixtures } from "./fixtures";

const DOM_HEALTH_QUERY = "edge_source_health=dom";

vi.mock("../../utils/fetch-text", () => {
  const defaultOptions = {
    headers: {
      "User-Agent": "Mozilla/5.0",
    },
  };

  return {
    fetchText: vi.fn(
      async (
        url: string,
        options: RequestInit = defaultOptions,
      ): Promise<string> => {
        if (
          url.includes("/addons/getproductdetailsbycrxid/") &&
          url.includes(DOM_HEALTH_QUERY)
        ) {
          throw new Error("Skip API source");
        }

        const response = await fetch(url, options);
        if (!response.ok) {
          throw new Error(`${response.status} ${response.statusText}: ${url}`);
        }

        return response.text();
      },
    ),
  };
});

type FieldHealthCheck = [
  field: string,
  read: (edgeAddons: EdgeAddons) => unknown,
  expected: unknown,
];

const sourceHealthChecks: Array<{
  source: string;
  fields: FieldHealthCheck[];
}> = [
  {
    source: "API",
    fields: [
      [
        "availability",
        (edgeAddons) => edgeAddons.sourceAPI.availability(),
        expect.any(Array),
      ],
      [
        "activeInstallCount",
        (edgeAddons) => edgeAddons.sourceAPI.activeInstallCount(),
        expect.any(Number),
      ],
      [
        "storeProductId",
        (edgeAddons) => edgeAddons.sourceAPI.storeProductId(),
        expect.any(String),
      ],
      ["name", (edgeAddons) => edgeAddons.sourceAPI.name(), expect.any(String)],
      [
        "logoUrl",
        (edgeAddons) => edgeAddons.sourceAPI.logoUrl(),
        expect.stringMatching(/^https:\/\//),
      ],
      [
        "description",
        (edgeAddons) => edgeAddons.sourceAPI.description(),
        expect.any(String),
      ],
      [
        "developer",
        (edgeAddons) => edgeAddons.sourceAPI.developer(),
        expect.any(String),
      ],
      [
        "category",
        (edgeAddons) => edgeAddons.sourceAPI.category(),
        expect.any(String),
      ],
      [
        "isInstalled",
        (edgeAddons) => edgeAddons.sourceAPI.isInstalled(),
        expect.any(Boolean),
      ],
      [
        "crxId",
        (edgeAddons) => edgeAddons.sourceAPI.crxId(),
        expect.any(String),
      ],
      [
        "manifest",
        (edgeAddons) => edgeAddons.sourceAPI.manifest(),
        expect.any(String),
      ],
      [
        "isHavingMatureContent",
        (edgeAddons) => edgeAddons.sourceAPI.isHavingMatureContent(),
        expect.any(Boolean),
      ],
      [
        "version",
        (edgeAddons) => edgeAddons.sourceAPI.version(),
        expect.any(String),
      ],
      [
        "lastUpdateDate",
        (edgeAddons) => edgeAddons.sourceAPI.lastUpdateDate(),
        expect.any(Number),
      ],
      [
        "privacyUrl",
        (edgeAddons) => edgeAddons.sourceAPI.privacyUrl(),
        expect.any(String),
      ],
      [
        "availabilityId",
        (edgeAddons) => edgeAddons.sourceAPI.availabilityId(),
        expect.any(String),
      ],
      [
        "skuId",
        (edgeAddons) => edgeAddons.sourceAPI.skuId(),
        expect.any(String),
      ],
      [
        "locale",
        (edgeAddons) => edgeAddons.sourceAPI.locale(),
        expect.any(String),
      ],
      [
        "market",
        (edgeAddons) => edgeAddons.sourceAPI.market(),
        expect.any(String),
      ],
      [
        "averageRating",
        (edgeAddons) => edgeAddons.sourceAPI.averageRating(),
        expect.any(Number),
      ],
      [
        "ratingCount",
        (edgeAddons) => edgeAddons.sourceAPI.ratingCount(),
        expect.any(Number),
      ],
      [
        "availableLanguages",
        (edgeAddons) => edgeAddons.sourceAPI.availableLanguages(),
        expect.any(Array),
      ],
      [
        "metadata",
        (edgeAddons) => edgeAddons.sourceAPI.metadata(),
        expect.any(Object),
      ],
      [
        "shortDescription",
        (edgeAddons) => edgeAddons.sourceAPI.shortDescription(),
        expect.any(String),
      ],
      [
        "searchKeywords",
        (edgeAddons) => edgeAddons.sourceAPI.searchKeywords(),
        expect.any(String),
      ],
      [
        "screenshots",
        (edgeAddons) => edgeAddons.sourceAPI.screenshots(),
        expect.any(Array),
      ],
      [
        "videos",
        (edgeAddons) => edgeAddons.sourceAPI.videos(),
        expect.any(Array),
      ],
      [
        "publisherWebsiteUri",
        (edgeAddons) => edgeAddons.sourceAPI.publisherWebsiteUri(),
        expect.any(String),
      ],
      [
        "isBadgedAsFeatured",
        (edgeAddons) => edgeAddons.sourceAPI.isBadgedAsFeatured(),
        expect.any(Boolean),
      ],
      [
        "privacyData",
        (edgeAddons) => edgeAddons.sourceAPI.privacyData(),
        expect.any(Object),
      ],
    ],
  },
  {
    source: "DOM",
    fields: [
      [
        "name",
        (edgeAddons) => edgeAddons.sourceDOM.name(),
        expect.any(String),
      ],
      [
        "averageRating",
        (edgeAddons) => edgeAddons.sourceDOM.averageRating(),
        expect.any(Number),
      ],
      [
        "ratingCount",
        (edgeAddons) => edgeAddons.sourceDOM.ratingCount(),
        expect.any(Number),
      ],
      [
        "url",
        (edgeAddons) => edgeAddons.sourceDOM.url(),
        expect.stringMatching(
          /^https:\/\/microsoftedge\.microsoft\.com\/addons\/detail\//,
        ),
      ],
    ],
  },
];

describe("Edge Add-ons source health", async () => {
  describe.each(await fixtures())("%s", (id) => {
    let apiEdgeAddons: EdgeAddons;
    let domEdgeAddons: EdgeAddons;

    beforeAll(async () => {
      apiEdgeAddons = await EdgeAddons.load({ id });

      domEdgeAddons = await EdgeAddons.load({
        id,
        qs: { edge_source_health: "dom" },
      });
    }, 30000);

    describe.each(sourceHealthChecks)("$source", ({ source, fields }) => {
      it.each(fields)("%s", (field, read, expected) => {
        const edgeAddons = source === "DOM" ? domEdgeAddons : apiEdgeAddons;

        expect(
          read(edgeAddons),
          `${source}.${field} should stay available for ${id}`,
        ).toEqual(expected);
      });
    });
  });
});
