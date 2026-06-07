import { fetch } from "undici";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchText } from "../fetch-text";

vi.mock("undici", () => ({
  fetch: vi.fn(),
}));

const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;

describe("fetchText", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("fetches text with default options", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: vi.fn().mockResolvedValue("html"),
    });

    await expect(fetchText("https://example.com")).resolves.toBe("html");
    expect(fetchMock).toHaveBeenCalledWith("https://example.com", {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });
  });

  it("passes custom options through", async () => {
    const options = { headers: { "User-Agent": "Custom" } };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      text: vi.fn().mockResolvedValue("custom"),
    });

    await expect(fetchText("https://example.com", options)).resolves.toBe(
      "custom",
    );
    expect(fetchMock).toHaveBeenCalledWith("https://example.com", options);
  });

  it("throws for non-ok responses", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    await expect(fetchText("https://example.com/missing")).rejects.toThrow(
      "404 Not Found: https://example.com/missing",
    );
  });
});
