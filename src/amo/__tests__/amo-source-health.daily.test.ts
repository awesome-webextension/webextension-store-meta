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
    source: "API",
    fields: [
      ["name", (amo) => amo.sourceAPI.name(), expect.any(String)],
      ["description", (amo) => amo.sourceAPI.description(), expect.any(String)],
      ["ratingValue", (amo) => amo.sourceAPI.ratingValue(), expect.any(Number)],
      ["ratingCount", (amo) => amo.sourceAPI.ratingCount(), expect.any(Number)],
      ["users", (amo) => amo.sourceAPI.users(), expect.any(Number)],
      ["version", (amo) => amo.sourceAPI.version(), expect.any(String)],
      ["url", (amo) => amo.sourceAPI.url(), expect.any(String)],
      ["image", (amo) => amo.sourceAPI.image(), expect.any(String)],
      ["size", (amo) => amo.sourceAPI.size(), expect.any(String)],
      ["lastUpdated", (amo) => amo.sourceAPI.lastUpdated(), expect.any(String)],
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
