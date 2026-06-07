import { beforeAll, describe, expect, it } from "vitest";
import { Amo } from "../";
import { fixtures } from "./fixtures";

type FieldHealthCheck = [
  field: string,
  read: (amo: Amo) => unknown,
  expected: unknown,
];

const sourceHealthChecks: Array<{
  source: string;
  fields: FieldHealthCheck[];
}> = [
  {
    source: "DOM",
    fields: [
      ["name", (amo) => amo.sourceDOM.name(), expect.any(String)],
      ["description", (amo) => amo.sourceDOM.description(), expect.any(String)],
      ["ratingValue", (amo) => amo.sourceDOM.ratingValue(), expect.any(Number)],
      ["ratingCount", (amo) => amo.sourceDOM.ratingCount(), expect.any(Number)],
      ["users", (amo) => amo.sourceDOM.users(), expect.any(Number)],
      ["version", (amo) => amo.sourceDOM.version(), expect.any(String)],
      ["url", (amo) => amo.sourceDOM.url(), expect.any(String)],
      ["image", (amo) => amo.sourceDOM.image(), expect.any(String)],
      ["size", (amo) => amo.sourceDOM.size(), expect.any(String)],
      ["lastUpdated", (amo) => amo.sourceDOM.lastUpdated(), expect.any(String)],
    ],
  },
  {
    source: "JSON-LD",
    fields: [
      ["name", (amo) => amo.sourceJSONLD.name(), expect.any(String)],
      [
        "description",
        (amo) => amo.sourceJSONLD.description(),
        expect.any(String),
      ],
      [
        "ratingValue",
        (amo) => amo.sourceJSONLD.ratingValue(),
        expect.any(Number),
      ],
      [
        "ratingCount",
        (amo) => amo.sourceJSONLD.ratingCount(),
        expect.any(Number),
      ],
      ["price", (amo) => amo.sourceJSONLD.price(), expect.any(Number)],
      [
        "priceCurrency",
        (amo) => amo.sourceJSONLD.priceCurrency(),
        expect.any(String),
      ],
      ["version", (amo) => amo.sourceJSONLD.version(), expect.any(String)],
      ["url", (amo) => amo.sourceJSONLD.url(), expect.any(String)],
      ["image", (amo) => amo.sourceJSONLD.image(), expect.any(String)],
      [
        "operatingSystem",
        (amo) => amo.sourceJSONLD.operatingSystem(),
        expect.any(String),
      ],
    ],
  },
  {
    source: "Redux store state",
    fields: [
      ["name", (amo) => amo.sourceReduxStoreState.name(), expect.any(String)],
      [
        "description",
        (amo) => amo.sourceReduxStoreState.description(),
        expect.any(String),
      ],
      [
        "ratingValue",
        (amo) => amo.sourceReduxStoreState.ratingValue(),
        expect.any(Number),
      ],
      [
        "ratingCount",
        (amo) => amo.sourceReduxStoreState.ratingCount(),
        expect.any(Number),
      ],
      ["users", (amo) => amo.sourceReduxStoreState.users(), expect.any(Number)],
      [
        "version",
        (amo) => amo.sourceReduxStoreState.version(),
        expect.any(String),
      ],
      ["url", (amo) => amo.sourceReduxStoreState.url(), expect.any(String)],
      ["image", (amo) => amo.sourceReduxStoreState.image(), expect.any(String)],
      ["size", (amo) => amo.sourceReduxStoreState.size(), expect.any(String)],
      [
        "lastUpdated",
        (amo) => amo.sourceReduxStoreState.lastUpdated(),
        expect.any(String),
      ],
    ],
  },
  {
    source: "Open Graph",
    fields: [
      ["description", (amo) => amo.sourceOG.description(), expect.any(String)],
      ["url", (amo) => amo.sourceOG.url(), expect.any(String)],
      ["image", (amo) => amo.sourceOG.image(), expect.any(String)],
    ],
  },
];

describe("AMO source health", async () => {
  describe.each(await fixtures())("%s", (extId) => {
    let amo: Amo;

    beforeAll(async () => {
      amo = await Amo.load({ id: extId });
    }, 20000);

    describe.each(sourceHealthChecks)("$source", ({ source, fields }) => {
      it.each(fields)("%s", (field, read, expected) => {
        expect(
          read(amo),
          `${source}.${field} should stay available for ${extId}`,
        ).toEqual(expected);
      });
    });
  });
});
