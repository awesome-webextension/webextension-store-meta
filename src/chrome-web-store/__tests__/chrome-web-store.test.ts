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

function pageData(id: string, ratingCount: number, users: number): string {
  const detail = new Array(15).fill(null);
  detail[0] = id;
  detail[4] = ratingCount;
  detail[14] = users;
  return `<script>AF_initDataCallback({key: 'ds:0', hash: '2', data: ${JSON.stringify([detail])}, sideChannel: {}});</script>`;
}

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

  it.each([
    ["en", "14.6K ratings", 14600],
    ["zh-CN", "1.5万 个评分", 15000],
  ])(
    "parses abbreviated legacy counts in %s",
    async (language, text, count) => {
      fetchTextMock.mockResolvedValueOnce(`
      <html lang="${language}">
        <head><link rel="canonical" href="${DETAIL_URL}"></head>
        <body>
          <div class="j3zrsd"><p class="xJEoWe">${text}</p></div>
          ${pageData("extension-id", 14631, 2000000)}
        </body>
      </html>
    `);

      const item = await ChromeWebStore.load({ id: "extension-id" });

      expect(item.ratingCount()).toBe(count);
      expect(item.users()).toBe(2000000);
    },
  );

  it("reads the localized rating and users from the new layout", async () => {
    fetchTextMock.mockResolvedValueOnce(`
      <html lang="de">
        <head><link rel="canonical" href="${DETAIL_URL}"></head>
        <body>
          <div class="j3zrsd">
            <div class="NipEU">
              <div class="x5MnV">
                <span class="MH16jb"><span class="Vq0ZA">3,8</span></span>
                <a href="./detail/name/extension-id/reviews" class="OPaHCf">14.631&nbsp;Bewertungen</a>
              </div>
              <div class="x5MnV"><span class="MH16jb">2&nbsp;Mio.</span><span class="OPaHCf">Nutzer</span></div>
              <div class="x5MnV"><span class="MH16jb">2026</span><span class="OPaHCf">letzte Aktualisierung</span></div>
            </div>
          </div>
          ${pageData("extension-id", 14630, 2100000)}
        </body>
      </html>
    `);

    const item = await ChromeWebStore.load({ id: "extension-id" });

    expect(item.meta()).toMatchObject({
      ratingValue: 3.8,
      ratingCount: 14631,
      users: 2000000,
    });
  });

  it("falls back for missing new-layout counts and keeps a zero from the DOM", async () => {
    fetchTextMock.mockResolvedValueOnce(`
      <html lang="en">
        <head><link rel="canonical" href="${DETAIL_URL}"></head>
        <body>
          <div class="j3zrsd">
            <div class="NipEU">
              <div class="x5MnV"><a href="./detail/name/extension-id/reviews" class="OPaHCf">0 ratings</a></div>
              <div class="x5MnV"><span class="MH16jb">2026</span><span class="OPaHCf">Last updated</span></div>
            </div>
          </div>
          ${pageData("extension-id", 50, 800)}
        </body>
      </html>
    `);

    const item = await ChromeWebStore.load({ id: "extension-id" });

    expect(item.ratingCount()).toBe(0);
    expect(item.users()).toBe(800);
  });

  it("falls back for a missing legacy rating count while keeping users from the DOM", async () => {
    fetchTextMock.mockResolvedValueOnce(`
      <link rel="canonical" href="${DETAIL_URL}">
      <div class="F9iKBc">900 users</div>
      ${pageData("extension-id", 50, 800)}
    `);

    const item = await ChromeWebStore.load({ id: "extension-id" });

    expect(item.meta()).toMatchObject({ ratingCount: 50, users: 900 });
  });

  it("does not use embedded counts for another extension", async () => {
    fetchTextMock.mockResolvedValueOnce(`
      <link rel="canonical" href="${DETAIL_URL}">
      ${pageData("related-extension", 123, 450)}
    `);

    const item = await ChromeWebStore.load({ id: "extension-id" });

    expect(item.meta()).toMatchObject({ ratingCount: null, users: null });
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
