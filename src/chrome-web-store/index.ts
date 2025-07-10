import type { RequestInit } from "undici";

import { parse, stringify } from "node:querystring";
import { DomHandler, type Node, isTag, isText } from "domhandler";
import { Parser } from "htmlparser2/lib/Parser";
import { findOne, getText, queryOne } from "../utils/dom";
import { fetchText } from "../utils/fetch-text";
import { parseVersion } from "../utils/parse";

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

function parseVersionFromManifest(maybeNode: Node | Node[]): string | null {
  const nodes = Array.isArray(maybeNode) ? maybeNode : [maybeNode];

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (!isTag(node)) {
      continue;
    }

    if (node.tagName === "script") {
      const content = getText(node);
      if (content.includes("AF_initDataCallback")) {
        const match = /"[\\nt\s]*({[\s\S]+})[\\nt\s]*",[\s\w\d]/.exec(content);
        if (match) {
          try {
            const manifest = JSON.parse(match[1].replace(/\n|\\n|\\t|\\/g, ""));
            if (manifest.version) {
              return String(manifest.version);
            }
          } catch {
            // do nothing
          }
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
