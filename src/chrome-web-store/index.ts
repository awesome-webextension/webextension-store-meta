import type { RequestInit } from "undici";

import { parse, stringify } from "node:querystring";
import { DomHandler, type Node, isTag, isText } from "domhandler";
import { Parser } from "htmlparser2/lib/Parser";
import { findOne, getText, queryOne } from "../utils/dom";
import { fetchText } from "../utils/fetch-text";
import { parseVersion } from "../utils/parse";
import JSON5 from "json5";
import * as process from "node:process";

export type { RequestInit };

export interface ChromeWebStoreMeta {
  name: string | null;
  description: string | null;
  url: string | null;
  image: string | null;
  ratingValue: string | null;
  ratingCount: string | null;
  users: string | null;
  version: string | null;
  size: string | null;
  lastUpdated: string | null;
}

export interface ChromeWebStoreOptions {
  /**
   * Chrome Web Store extension ID
   * @example "cdonnmffkdaoajfknoeeecmchibpmkmg"
   */
  id: string;
  /**
   * `undici.fetch` options
   * @see {@link https://undici.nodejs.org/#/?id=undicifetchinput-init-promise}
   */
  options?: RequestInit;
  /**
   * Query string
   */
  qs?: Record<string, string> | string;
}

export class ChromeWebStore {
  public id: string;
  public options?: RequestInit;
  public qs: string;

  private _dom: Node[] | null = null;
  private _cache = new Map<string, string | null>();

  public constructor({ id, options, qs }: ChromeWebStoreOptions) {
    this.id = id;
    this.options = options;
    this.qs = stringify(
      typeof qs === "string" ? parse(qs.replace(/^\?/, "")) : qs || {},
    );
  }

  static async load(options: ChromeWebStoreOptions): Promise<ChromeWebStore> {
    const instance = new ChromeWebStore(options);
    await instance.load();
    return instance;
  }

  async load(): Promise<ChromeWebStore> {
    const url = `https://chromewebstore.google.com/detail/${this.id}?${this.qs}`;
    const html = await fetchText(url, this.options);

    const handler = new DomHandler();
    new Parser(handler).end(html);
    this._dom = handler.dom;

    return this;
  }

  meta(): ChromeWebStoreMeta {
    return {
      name: this.name(),
      description: this.description(),
      url: this.url(),
      image: this.image(),
      ratingValue: this.ratingValue(),
      ratingCount: this.ratingCount(),
      users: this.users(),
      version: this.version(),
      size: this.size(),
      lastUpdated: this.lastUpdated(),
    };
  }

  public name(): string | null {
    return this._og("og:title");
  }

  public description(): string | null {
    return this._og("og:description");
  }

  public url(): string | null {
    let url = this._og("og:url");
    if (url) return url;

    const urlElem = findOne(
      (elem) => elem.name === "link" && elem.attribs.rel === "canonical",
      this.dom,
    );
    if (urlElem) {
      url = urlElem.attribs.href;
      if (url) {
        this._cache.set("og:url", url);
        return url;
      }
    }

    return null;
  }

  public image(): string | null {
    return this._og("og:image");
  }

  public ratingValue(): string | null {
    return this._parseRating("ratingValue");
  }

  public ratingCount(): string | null {
    return this._parseRating("ratingCount");
  }

  public users(): string | null {
    if (!this._cache.has("users")) {
      const container = queryOne(this.dom, "F9iKBc");
      if (container) {
        for (let i = 0; i < container.children.length; i++) {
          const node = container.children[i];
          if (isText(node)) {
            const content = getText(node);
            const match = /[\d,]+/.exec(content);
            if (match) {
              this._cache.set("users", match[0]);
              break;
            }
          }
        }
      }
      if (!this._cache.has("users")) {
        this._cache.set("users", null);
      }
    }

    return this._cache.get("users") ?? null;
  }

  private readonly versionClassName = "nBZElf";

  public version(): string | null {
    if (!this._cache.has("version")) {
      const el = queryOne(this.dom, this.versionClassName) || queryOne(this.dom, "N3EXSc");
      this._cache.set(
        "version",
        (el && parseVersion(getText(el))) || this.versionFallback(),
      );
    }

    return this._cache.get("version") ?? null;
  }

  /**
   * Fallback method for extracting the extension version from a Chrome Web Store detail page.
   *
   * This function searches for a <script class="ds:0"> element, which contains a JS literal of the form
   * `AF_initDataCallback({ ... });`. The literal is parsed as a string, and the inner object is extracted.
   *   <script class="ds:0" nonce>AF_initDataCallback(...);</script>
   *
   * The manifest JSON string is located at the last element of `data[0]` in the parsed object.
   * The function parses this manifest string and returns the `version` field.
   *   {
   *     key: 'ds:0',
   *     hash: '2',
   *     data: [
   *       [
   *         ...,
   *         "{\n \"version": \"7.20.0\n ...\n}",
   *       ],
   *       ...,
   *     ],
   *     sideChannel: {}
   *   }
   */
  private versionFallback(): string | null {
    // Warn in vitest if execution reaches here
    if (process.env.VITEST && process.env.VITEST === "true" && !process.env.allowVersionFallback) {
      throw new Error(`fallback method is being used, please check if versionClassName is correct. (${this.versionClassName})`);
    }
    const AF_initDataCallbackEl = queryOne(this.dom, "ds:0");
    const rawText = getText(AF_initDataCallbackEl);

    if (!(rawText.startsWith("AF_initDataCallback(") && rawText.endsWith(");"))) {
      //AF_initDataCallbackEl does not match an expected format
      return null;
    }

    const match = rawText.slice("AF_initDataCallback(".length, -2);
    try {
      // Use JSON5 to parse JS literals
      const callbackData = JSON5.parse(match);
      if (!callbackData.data || !callbackData.data[0] || !Array.isArray(callbackData.data[0])) {
          return null;
      }

      try {
        const manifest = JSON.parse(callbackData.data[0][callbackData.data[0].length - 1]);
        const version = manifest.version;
        return String(version);
      } catch {
        return null;
      }
    } catch (e) {
      // Ignore JSON parsing errors

      // console.error("Error parsing version from manifest:", e);
      // if(e.columnNumber && e.lineNumber) {
      //   console.error(`Error at line ${e.lineNumber}, column ${e.columnNumber}`);
      //   // print range from column -20 ~ 20
      //   const lines = match.split("\n");
      //   const line = lines[e.lineNumber - 1] || "";
      //   const start = Math.max(0, e.columnNumber - 20);
      //   const end = Math.min(line.length, e.columnNumber + 20);
      //   console.error(`Error context: "${line.slice(start, end)}"`);
      // }
    }

    return null;
  }

  public size(): string | null {
    if (!this._cache.has("size")) {
      const el = queryOne(this.dom, "ZSMSLb");
      this._cache.set("size", getText(el?.lastChild) || null)
    }

    return this._cache.get("size") ?? null;
  }

  public lastUpdated(): string | null {
    if (!this._cache.has("lastUpdated")) {
      const el = queryOne(this.dom, "uBIrad");
      this._cache.set("lastUpdated", getText(el?.lastChild) || null)
    }

    return this._cache.get("lastUpdated") ?? null;
  }

  public get dom() {
    if (!this._dom) {
      throw new Error(
        "Item not loaded. Please run `await instance.load()` first.`",
      );
    }
    return this._dom;
  }

  private _og(property: string): string | null {
    if (!this._cache.has(property)) {
      findOne((elem) => {
        if (elem.attribs.property == null) return false;
        this._cache.set(elem.attribs.property, elem.attribs.content);
        return elem.attribs.property === property;
      }, this.dom);

      if (!this._cache.has(property)) {
        this._cache.set(property, null);
      }
    }

    return this._cache.get(property) ?? null;
  }

  private _parseRating(key: "ratingValue" | "ratingCount"): string | null {
    if (!this._cache.has(key)) {
      const result = parseRating(this.dom);
      this._cache.set("ratingValue", result?.ratingValue ?? null);
      this._cache.set("ratingCount", result?.ratingCount ?? null);
    }

    return this._cache.get(key) ?? null;
  }
}

export default ChromeWebStore;

function parseRating(
  dom: Node | Node[],
): { ratingValue: string | null; ratingCount: string | null } | null {
  const container = queryOne(dom, "j3zrsd");
  if (container) {
    const result = {
      ratingValue: null as string | null,
      ratingCount: null as string | null,
    };

    const ratingValueEl = queryOne(container, "Vq0ZA");
    if (ratingValueEl) {
      const ratingValue = getText(ratingValueEl);
      if (/^\d+\.?\d*$/.test(ratingValue)) {
        result.ratingValue = ratingValue;
      }
    }

    const ratingCountEl = queryOne(container, "xJEoWe");
    if (ratingCountEl) {
      result.ratingCount = getText(ratingCountEl).replace(/\s*ratings$/, "");
    }

    if (result.ratingValue !== null || result.ratingCount !== null) {
      return result;
    }
  }
  return null;
}
