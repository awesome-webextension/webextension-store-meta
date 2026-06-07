import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.daily.test.ts"],
  },
});
