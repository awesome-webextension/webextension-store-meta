import { fetch } from "undici";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchText } from "../fetch-text";

vi.mock("undici", () => ({
  fetch: vi.fn(),
}));

const mockedFetch = fetch as ReturnType<typeof vi.fn>;

describe("fetchText", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch and return text from URL", async () => {
    mockedFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => "Hello World",
    } as Response);

    const result = await fetchText("https://example.com");
    expect(result).toBe("Hello World");
    expect(mockedFetch).toHaveBeenCalledWith(
      "https://example.com",
      expect.objectContaining({
        headers: expect.objectContaining({
          "User-Agent": "Mozilla/5.0",
        }),
      }),
    );
  });

  it("should throw error for non-OK responses", async () => {
    mockedFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
      text: async () => "Not Found",
    } as Response);

    await expect(fetchText("https://example.com")).rejects.toThrow(
      "404 Not Found: https://example.com",
    );
  });

  it("should accept custom headers", async () => {
    mockedFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => "result",
    } as Response);

    await fetchText("https://example.com", {
      headers: { "Custom-Header": "value" },
    });

    expect(mockedFetch).toHaveBeenCalledWith(
      "https://example.com",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Custom-Header": "value",
        }),
      }),
    );
  });

  it("should allow overriding default headers", async () => {
    mockedFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      statusText: "OK",
      text: async () => "result",
    } as Response);

    await fetchText("https://example.com", {
      headers: { "User-Agent": "CustomAgent" },
    });

    expect(mockedFetch).toHaveBeenCalledWith(
      "https://example.com",
      expect.objectContaining({
        headers: expect.objectContaining({
          "User-Agent": "CustomAgent",
        }),
      }),
    );
  });
});
