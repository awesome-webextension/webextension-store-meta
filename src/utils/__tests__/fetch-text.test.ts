import { describe, expect, it, vi } from "vitest";

vi.mock("undici", () => ({
  fetch: vi.fn(),
}));

import { fetch } from "undici";
import { fetchText } from "../fetch-text";

const fetchMock = vi.mocked(fetch);

describe("fetchText", () => {
  it("should return text for successful responses", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve("<html>content</html>"),
    } as unknown as Awaited<ReturnType<typeof fetch>>);

    const result = await fetchText("https://example.com");
    expect(result).toBe("<html>content</html>");
    expect(fetchMock).toHaveBeenCalledWith("https://example.com", {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
  });

  it("should pass custom options to fetch", async () => {
    const options = { headers: { "Accept-Language": "en" } };
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve("ok"),
    } as unknown as Awaited<ReturnType<typeof fetch>>);

    await fetchText("https://example.com", options);
    expect(fetchMock).toHaveBeenCalledWith("https://example.com", options);
  });

  it("should throw error for non-ok responses", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
    } as unknown as Awaited<ReturnType<typeof fetch>>);

    await expect(fetchText("https://example.com/missing")).rejects.toThrow(
      "404 Not Found: https://example.com/missing",
    );
  });

  it("should throw error for server errors", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    } as unknown as Awaited<ReturnType<typeof fetch>>);

    await expect(fetchText("https://example.com/error")).rejects.toThrow(
      "500 Internal Server Error",
    );
  });
});
