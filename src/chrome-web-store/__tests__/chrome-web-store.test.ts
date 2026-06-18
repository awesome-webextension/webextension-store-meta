import type { Node } from "domhandler";
import { DomHandler } from "domhandler";
import { Parser } from "htmlparser2/lib/Parser";
import {
  beforeEach,
  describe,
  expect,
  it,
  type MockedFunction,
  vi,
} from "vitest";
import { fetchText } from "../../utils/fetch-text";
import { ChromeWebStore } from "../";

vi.mock("../../utils/fetch-text", () => ({
  fetchText: vi.fn(),
}));

const fetchTextMock = fetchText as MockedFunction<typeof fetchText>;

const parseDOM = (html: string) => {
  const handler = new DomHandler();
  new Parser(handler).end(html);
  return handler.dom;
};

const DETAIL_URL = "https://chromewebstore.google.com/detail/name/extension-id";

describe("Chrome Web Store", () => {
  beforeEach(() => {
    fetchTextMock.mockReset();
  });

  it("extracts full detail page metadata", async () => {
    fetchTextMock.mockResolvedValueOnce(`
      <!doctype html>
      <html>
        <head>
          <link rel="canonical" href="${DETAIL_URL}">
          <meta property="og:title" content="Extension title">
          <meta property="og:description" content="Extension description">
          <meta property="og:url" content="${DETAIL_URL}">
          <meta property="og:image" content="https://example.com/image.png">
        </head>
        <body>
          <div class="F9iKBc">Users <span>ignored</span> 12,345 users</div>
          <div class="j3zrsd">
            <span class="Vq0ZA">4.7</span>
            <span class="xJEoWe">321 ratings</span>
          </div>
          <div class="nBZElf">Version 1.2.3</div>
          <div class="ZSMSLb"><span>Size</span><span>10 MB</span></div>
          <div class="uBIrad"><span>Updated</span><span>2024-01-01</span></div>
        </body>
      </html>
    `);

    const chromeWebStore = await ChromeWebStore.load({ id: "extension-id" });

    expect(chromeWebStore.meta()).toEqual({
      name: "Extension title",
      description: "Extension description",
      url: DETAIL_URL,
      image: "https://example.com/image.png",
      ratingValue: 4.7,
      ratingCount: 321,
      users: 12345,
      version: "1.2.3",
      size: "10 MB",
      lastUpdated: "2024-01-01",
    });
    expect(chromeWebStore.users()).toBe(12345);
    expect(chromeWebStore.version()).toBe("1.2.3");
  });

  it("concat querystring from objects and strings", async () => {
    fetchTextMock.mockResolvedValue(`
      <!doctype html>
      <html>
        <head><link rel="canonical" href="${DETAIL_URL}"></head>
      </html>
    `);

    await ChromeWebStore.load({
      id: "extension-id",
      qs: { hl: "zh", lr: "lang_zh-CN" },
    });
    await ChromeWebStore.load({
      id: "extension-id",
      qs: "?utm=1",
    });

    expect(fetchTextMock).toHaveBeenNthCalledWith(
      1,
      "https://chromewebstore.google.com/detail/extension-id?hl=zh&lr=lang_zh-CN",
      undefined,
    );
    expect(fetchTextMock).toHaveBeenNthCalledWith(
      2,
      "https://chromewebstore.google.com/detail/extension-id?utm=1",
      undefined,
    );
  });

  it("throws error if document is not loaded", () => {
    const chromeWebStore = new ChromeWebStore({ id: "extension-id" });
    expect(() => chromeWebStore.meta()).toThrow(
      "Item not loaded. Please run `await instance.load()` first.`",
    );
  });

  it("returns nulls if extension is not found", async () => {
    fetchTextMock.mockResolvedValueOnce(`
      <!doctype html>
      <html>
        <head><link rel="canonical" href="https://example.com/not-found"></head>
      </html>
    `);

    const chromeWebStore = await ChromeWebStore.load({ id: "missing" });

    expect(chromeWebStore.meta()).toEqual({
      name: null,
      description: null,
      url: null,
      image: null,
      ratingValue: null,
      ratingCount: null,
      users: null,
      version: null,
      size: null,
      lastUpdated: null,
    });
  });

  it("falls back to canonical URL when og:url is missing", async () => {
    fetchTextMock.mockResolvedValueOnce(`
      <!doctype html>
      <html>
        <head>
          <link rel="canonical" href="${DETAIL_URL}">
          <meta property="og:title" content="Extension title">
        </head>
      </html>
    `);

    const chromeWebStore = await ChromeWebStore.load({ id: "extension-id" });

    expect(chromeWebStore.url()).toBe(DETAIL_URL);
    expect(chromeWebStore.url()).toBe(DETAIL_URL);
  });

  it("parses alternate and manifest versions", async () => {
    fetchTextMock
      .mockResolvedValueOnce(`
        <!doctype html>
        <html>
          <head><link rel="canonical" href="${DETAIL_URL}"></head>
          <body><div class="N3EXSc">Version 5.6.7</div></body>
        </html>
      `)
      .mockResolvedValueOnce(`
        <!doctype html>
        <html>
          <head><link rel="canonical" href="${DETAIL_URL}"></head>
          <body>
            <main>
              <script>
                AF_initDataCallback({data: "{\\"version\\": \\"8.9.10\\"}"})
              </script>
            </main>
          </body>
        </html>
      `);

    const alternateVersion = await ChromeWebStore.load({ id: "extension-id" });
    const manifestVersion = await ChromeWebStore.load({ id: "extension-id" });

    expect(alternateVersion.version()).toBe("5.6.7");
    expect(manifestVersion.version()).toBe("8.9.10");
  });

  it("handles partial rating and users markup", async () => {
    fetchTextMock
      .mockResolvedValueOnce(`
        <!doctype html>
        <html>
          <head><link rel="canonical" href="${DETAIL_URL}"></head>
          <body>
            <div class="F9iKBc">no user count here</div>
            <div class="j3zrsd">
              <span class="Vq0ZA">not a number</span>
            </div>
          </body>
        </html>
      `)
      .mockResolvedValueOnce(`
        <!doctype html>
        <html>
          <head><link rel="canonical" href="${DETAIL_URL}"></head>
          <body>
            <div class="j3zrsd">
              <span class="xJEoWe">45 ratings</span>
            </div>
          </body>
        </html>
      `)
      .mockResolvedValueOnce(`
        <!doctype html>
        <html>
          <head></head>
          <body><div class="j3zrsd"></div></body>
        </html>
      `);

    const invalidRating = await ChromeWebStore.load({ id: "extension-id" });
    const countOnly = await ChromeWebStore.load({ id: "extension-id" });
    const missingCanonical = await ChromeWebStore.load({ id: "extension-id" });

    expect(invalidRating.users()).toBeNull();
    expect(invalidRating.ratingValue()).toBeNull();
    expect(invalidRating.ratingCount()).toBeNull();
    expect(countOnly.ratingValue()).toBeNull();
    expect(countOnly.ratingCount()).toBe(45);
    expect(missingCanonical.meta()).toMatchObject({
      url: null,
      ratingValue: null,
      ratingCount: null,
    });
  });

  it("returns null for canonical elements without href", () => {
    const chromeWebStore = new ChromeWebStore({ id: "extension-id" });
    (
      chromeWebStore as unknown as {
        _dom: Node[];
      }
    )._dom = parseDOM('<link rel="canonical">');

    expect(chromeWebStore.url()).toBeNull();
  });
});
