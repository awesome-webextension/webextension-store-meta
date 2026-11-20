import { parse, stringify } from "node:querystring";
import { DomHandler, isTag, type Node } from "domhandler";
import { Parser } from "htmlparser2/lib/Parser";
import type { RequestInit } from "undici";
import { findOne, getText, queryOne } from "../utils/dom";
import { fetchText } from "../utils/fetch-text";
import { parseVersion } from "../utils/parse";
import {
  type ChromeWebStoreMetrics,
  parseCountsFromPageData,
  parseMetricsFromDOM,
} from "./parse-metrics";

export type { RequestInit };

export interface ChromeWebStoreMeta {
  name: string | null;
  description: string | null;
  url: string | null;
  image: string | null;
  ratingValue: number | null;
  ratingCount: number | null;
  users: number | null;
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
  private _metrics: ChromeWebStoreMetrics | null = null;

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

    const href = findOne(
      (el) => el.tagName === "link" && el.attribs.rel === "canonical",
      handler.dom,
    )?.attribs.href;

    // Only keep DOM if it's an item page
    this._dom = href?.includes("/detail/") ? handler.dom : [];
    this._cache.clear();
    this._metrics = null;

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

  public ratingValue(): number | null {
    return this.metrics.ratingValue;
  }

  public ratingCount(): number | null {
    return this.metrics.ratingCount;
  }

  public users(): number | null {
    return this.metrics.users;
  }

  public version(): string | null {
    if (!this._cache.has("version")) {
      const el = queryOne(this.dom, "nBZElf") || queryOne(this.dom, "N3EXSc");
      this._cache.set(
        "version",
        (el && parseVersion(getText(el))) || parseVersionFromManifest(this.dom),
      );
    }

    return this._cache.get("version") ?? null;
  }

  public size(): string | null {
    if (!this._cache.has("size")) {
      const el = queryOne(this.dom, "ZSMSLb");
      this._cache.set("size", getText(el?.lastChild) || null);
    }

    return this._cache.get("size") ?? null;
  }

  public lastUpdated(): string | null {
    if (!this._cache.has("lastUpdated")) {
      const el = queryOne(this.dom, "uBIrad");
      this._cache.set("lastUpdated", getText(el?.lastChild) || null);
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

  private get metrics(): ChromeWebStoreMetrics {
    if (!this._metrics) {
      const { ratingValue, ratingCount, users } = parseMetricsFromDOM(
        this.dom,
        this.id,
      );
      const fallback =
        ratingCount === null || users === null
          ? parseCountsFromPageData(this.dom, this.id)
          : null;
      this._metrics = {
        ratingValue,
        ratingCount: ratingCount ?? fallback?.ratingCount ?? null,
        users: users ?? fallback?.users ?? null,
      };
    }

    return this._metrics;
  }
}

export default ChromeWebStore;

function parseVersionFromManifest(nodes: Node[]): string | null {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (!isTag(node)) {
      continue;
    }

    if (node.tagName === "script") {
      const content = getText(node);
      if (content.includes("AF_initDataCallback")) {
        const match = /\\"version\\":\s*\\"([\d.]+)\\"/.exec(content);
        if (match) {
          return match[1];
        }
      }
    }

    if (node.children.length > 0) {
      const version = parseVersionFromManifest(node.children);
      if (version) {
        return version;
      }
    }
  }

  return null;
}
