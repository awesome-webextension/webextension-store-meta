import { describe, expect, it, vi } from "vitest";
import { ChromeWebStore } from "../";

vi.mock("../../utils/fetch-text", () => ({
  fetchText: vi.fn(),
}));

import { fetchText } from "../../utils/fetch-text";

const fetchTextMock = vi.mocked(fetchText);

describe("ChromeWebStore parsing", () => {
  function makeCWSHTML(opts: {
    ogTitle?: string;
    ogDescription?: string;
    ogUrl?: string;
    ogImage?: string;
    canonicalUrl?: string;
    ratingValue?: string;
    ratingCount?: string;
    users?: string;
    version?: string;
    size?: string;
    lastUpdated?: string;
    versionFromManifest?: string;
  }) {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          ${opts.canonicalUrl ? `<link rel="canonical" href="${opts.canonicalUrl}">` : '<link rel="canonical" href="https://chromewebstore.google.com/detail/test/abc123">'}
          ${opts.ogTitle ? `<meta property="og:title" content="${opts.ogTitle}">` : ""}
          ${opts.ogDescription ? `<meta property="og:description" content="${opts.ogDescription}">` : ""}
          ${opts.ogUrl ? `<meta property="og:url" content="${opts.ogUrl}">` : ""}
          ${opts.ogImage ? `<meta property="og:image" content="${opts.ogImage}">` : ""}
        </head>
        <body>
          ${
            opts.ratingValue || opts.ratingCount
              ? `<div class="j3zrsd">
                  ${opts.ratingValue ? `<div class="Vq0ZA">${opts.ratingValue}</div>` : ""}
                  ${opts.ratingCount ? `<div class="xJEoWe">${opts.ratingCount} ratings</div>` : ""}
                </div>`
              : ""
          }
          ${opts.users ? `<div class="F9iKBc">${opts.users} users</div>` : ""}
          ${opts.version ? `<div class="nBZElf">${opts.version}</div>` : ""}
          ${opts.size ? `<div class="ZSMSLb"><span>Size</span><span>${opts.size}</span></div>` : ""}
          ${opts.lastUpdated ? `<div class="uBIrad"><span>Updated</span><span>${opts.lastUpdated}</span></div>` : ""}
          ${
            opts.versionFromManifest
              ? `<script>AF_initDataCallback({\\"version\\":\\"${opts.versionFromManifest}\\"});</script>`
              : ""
          }
        </body>
      </html>
    `;
  }

  it("should parse all meta fields from complete CWS page", async () => {
    fetchTextMock.mockResolvedValueOnce(
      makeCWSHTML({
        ogTitle: "Test Extension",
        ogDescription: "A test extension",
        ogUrl: "https://chromewebstore.google.com/detail/test/abc123",
        ogImage: "https://lh3.googleusercontent.com/icon.png",
        ratingValue: "4.8",
        ratingCount: "2,500",
        users: "100,000",
        version: "Version 2.1.0",
        size: "1.5 MB",
        lastUpdated: "January 15, 2024",
      }),
    );

    const cws = await ChromeWebStore.load({ id: "abc123" });
    const meta = cws.meta();

    expect(meta.name).toBe("Test Extension");
    expect(meta.description).toBe("A test extension");
    expect(meta.url).toBe(
      "https://chromewebstore.google.com/detail/test/abc123",
    );
    expect(meta.image).toBe("https://lh3.googleusercontent.com/icon.png");
    expect(meta.ratingValue).toBe("4.8");
    expect(meta.ratingCount).toBe("2,500");
    expect(meta.users).toBe("100,000");
    expect(meta.version).toBe("2.1.0");
    expect(meta.size).toBe("1.5 MB");
    expect(meta.lastUpdated).toBe("January 15, 2024");
  });

  it("should return null for non-item pages (no /detail/ in canonical)", async () => {
    fetchTextMock.mockResolvedValueOnce(`
      <!DOCTYPE html>
      <html>
        <head>
          <link rel="canonical" href="https://chromewebstore.google.com/category/extensions">
          <meta property="og:title" content="Chrome Web Store">
        </head>
        <body></body>
      </html>
    `);

    const cws = await ChromeWebStore.load({ id: "nonexistent" });
    const meta = cws.meta();
    expect(meta.name).toBeNull();
    expect(meta.description).toBeNull();
  });

  it("should handle querystring construction", () => {
    const cws1 = new ChromeWebStore({
      id: "abc",
      qs: { hl: "en", lr: "lang_en" },
    });
    expect(cws1.qs).toBe("hl=en&lr=lang_en");

    const cws2 = new ChromeWebStore({
      id: "abc",
      qs: "?hl=en&lr=lang_en",
    });
    expect(cws2.qs).toBe("hl=en&lr=lang_en");

    const cws3 = new ChromeWebStore({
      id: "abc",
      qs: "hl=en&lr=lang_en",
    });
    expect(cws3.qs).toBe("hl=en&lr=lang_en");

    const cws4 = new ChromeWebStore({ id: "abc" });
    expect(cws4.qs).toBe("");
  });

  it("should throw if meta() is called before load()", () => {
    const cws = new ChromeWebStore({ id: "abc123" });
    expect(() => cws.meta()).toThrow("Item not loaded");
  });

  it("should fall back to canonical link for url when og:url is missing", async () => {
    fetchTextMock.mockResolvedValueOnce(`
      <!DOCTYPE html>
      <html>
        <head>
          <link rel="canonical" href="https://chromewebstore.google.com/detail/test/abc123">
        </head>
        <body></body>
      </html>
    `);

    const cws = await ChromeWebStore.load({ id: "abc123" });
    expect(cws.url()).toBe(
      "https://chromewebstore.google.com/detail/test/abc123",
    );
  });

  it("should parse rating with only ratingValue", async () => {
    fetchTextMock.mockResolvedValueOnce(
      makeCWSHTML({ ratingValue: "3.5" }),
    );

    const cws = await ChromeWebStore.load({ id: "abc123" });
    expect(cws.ratingValue()).toBe("3.5");
    expect(cws.ratingCount()).toBeNull();
  });

  it("should return null ratingValue for non-numeric rating text", async () => {
    fetchTextMock.mockResolvedValueOnce(`
      <!DOCTYPE html>
      <html>
        <head>
          <link rel="canonical" href="https://chromewebstore.google.com/detail/test/abc123">
        </head>
        <body>
          <div class="j3zrsd">
            <div class="Vq0ZA">Not a number</div>
          </div>
        </body>
      </html>
    `);

    const cws = await ChromeWebStore.load({ id: "abc123" });
    expect(cws.ratingValue()).toBeNull();
  });

  it("should strip 'ratings' suffix from rating count", async () => {
    fetchTextMock.mockResolvedValueOnce(
      makeCWSHTML({ ratingValue: "4.0", ratingCount: "1,234" }),
    );

    const cws = await ChromeWebStore.load({ id: "abc123" });
    expect(cws.ratingCount()).toBe("1,234");
  });

  it("should extract users with comma-separated numbers", async () => {
    fetchTextMock.mockResolvedValueOnce(
      makeCWSHTML({ users: "1,234,567" }),
    );

    const cws = await ChromeWebStore.load({ id: "abc123" });
    expect(cws.users()).toBe("1,234,567");
  });

  it("should call individual methods independently", async () => {
    fetchTextMock.mockResolvedValueOnce(
      makeCWSHTML({
        ogTitle: "My Ext",
        ogDescription: "My Desc",
        version: "1.0.0",
      }),
    );

    const cws = await ChromeWebStore.load({ id: "abc123" });
    expect(cws.name()).toBe("My Ext");
    expect(cws.description()).toBe("My Desc");
    expect(cws.version()).toBe("1.0.0");
    expect(cws.users()).toBeNull();
  });
});
