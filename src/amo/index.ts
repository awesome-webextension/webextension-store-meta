import { stringify } from "node:querystring";
import { type DataNode, DomHandler, type Node } from "domhandler";
import { Parser } from "htmlparser2/lib/Parser";
import type { RequestInit } from "undici";
import { findOne, getText, queryOne } from "../utils/dom";
import { fetchText } from "../utils/fetch-text";
import { parseNum, parseVersion } from "../utils/parse";

export interface AmoOptions {
  /**
   * Chrome Web Store extension ID
   * @example "cdonnmffkdaoajfknoeeecmchibpmkmg"
   */
  id: string;
  /**
   * Locale on the extension url
   */
  locale?: string;
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

export interface AmoMeta {
  name: string | null;
  description: string | null;
  ratingValue: number | null;
  ratingCount: number | null;
  users: number | null;
  price: string | null;
  priceCurrency: string | null;
  version: string | null;
  url: string | null;
  image: string | null;
  operatingSystem: string | null;
  size: string | null;
  lastUpdated: string | null;
}

export class Amo {
  public config: AmoOptions;

  private _itempropMemo: {
    name?: string | null;
    description?: string | null;
    url?: string | null;
    image?: string | null;
    operatingSystem?: string | null;
    aggregateRating?: { ratingValue?: number; ratingCount?: number };
    ratingValue?: number | null;
    ratingCount?: number | null;
    offers?: { price?: string; priceCurrency?: string };
    price?: string | null;
    priceCurrency?: string | null;
  } & { [K in string]?: string | null } = {};

  private _ogMemo: Record<string, string | null> = {};

  private _dom: Node[] | null = null;

  public constructor(config: AmoOptions) {
    this.config = config || {};
  }

  public static async load(config: AmoOptions): Promise<Amo> {
    const instance = new Amo(config);
    await instance.load();
    return instance;
  }

  public async load(): Promise<Amo> {
    let qs = this.config.qs
      ? typeof this.config.qs === "string"
        ? this.config.qs
        : stringify(this.config.qs)
      : "";
    if (qs && !qs.startsWith("?")) {
      qs = `?${qs}`;
    }

    const locale = this.config.locale ? `${this.config.locale}/` : "";

    const url = `https://addons.mozilla.org/${locale}firefox/addon/${this.config.id}${qs}`;
    const html = await fetchText(url, this.config.options);

    const handler = new DomHandler();
    new Parser(handler).end(html);
    this._dom = handler.dom;

    const schema = findOne(
      (elem) =>
        elem.name === "script" && elem.attribs.type === "application/ld+json",
      this._dom,
    );

    if (schema) {
      try {
        this._itempropMemo = JSON.parse((schema.children[0] as DataNode).data);

        if (this._itempropMemo.aggregateRating) {
          const { ratingValue, ratingCount } =
            this._itempropMemo.aggregateRating;
          if (this._itempropMemo.ratingValue == null) {
            this._itempropMemo.ratingValue =
              ratingValue == null ? null : ratingValue;
          }
          if (this._itempropMemo.ratingCount == null) {
            this._itempropMemo.ratingCount =
              ratingCount == null ? null : ratingCount;
          }
        }

        if (this._itempropMemo.offers) {
          const { price, priceCurrency } = this._itempropMemo.offers;
          if (this._itempropMemo.price == null) {
            this._itempropMemo.price = price == null ? null : price;
          }
          if (this._itempropMemo.priceCurrency == null) {
            this._itempropMemo.priceCurrency =
              priceCurrency == null ? null : priceCurrency;
          }
        }
      } catch (e) {
        // ignore corrupted schema
      }
    }

    return this;
  }

  public meta(): AmoMeta {
    // fill cache all at once to reduce DOM traversal times.
    findOne((elem) => {
      const { itemprop, property, content } = elem.attribs;
      if (itemprop && this._itempropMemo[itemprop] == null) {
        this._itempropMemo[itemprop] = content;
      } else if (property) {
        this._ogMemo[property] = content;
      }
      return false;
    }, this.dom);

    return {
      name: this.name(),
      description: this.description(),
      ratingValue: this.ratingValue(),
      ratingCount: this.ratingCount(),
      users: this.users(),
      price: this.price(),
      priceCurrency: this.priceCurrency(),
      version: this.version(),
      url: this.url(),
      image: this.image(),
      operatingSystem: this.operatingSystem(),
      size: this.size(),
      lastUpdated: this.lastUpdated(),
    };
  }

  public name(): string | null {
    let name = this._itemprop("name") || this._og("og:title");
    if (name) return name;

    const title = queryOne(this.dom, "AddonTitle");
    if (title) {
      name = getText(title)
        .replace(getText(queryOne(title, "AddonTitle-author")), "")
        .trim();
      if (name) return name;
    }

    return null;
  }

  public description(): string | null {
    let des = this._itemprop("description");
    if (des) return des;

    des = getText(queryOne(this.dom, "Addon-summary"));
    if (des) return des;

    // og and meta have extra prefix

    des = this._og("og:description");
    if (des) return des;

    const desElem = findOne(
      (elem) => elem.name === "meta" && elem.attribs.name === "Description",
      this.dom,
    );
    if (desElem) {
      des = desElem.attribs.content;
      if (des) return des;
    }

    return null;
  }

  public ratingValue(): number | null {
    let ratingValue = parseNum(this._itemprop("ratingValue"));
    if (ratingValue >= 0 && ratingValue <= 5) return ratingValue;

    ratingValue = parseNum(
      getText(queryOne(this.dom, "AddonMeta-rating-title")),
    );
    if (ratingValue >= 0 && ratingValue <= 5) return ratingValue;

    return null;
  }

  public ratingCount(): number | null {
    let ratingCount = parseNum(this._itemprop("ratingCount"));
    if (ratingCount >= 0) return ratingCount;

    ratingCount = parseNum(
      getText(queryOne(this.dom, "AddonMeta-reviews-content-link")),
    );
    if (ratingCount >= 0) return ratingCount;

    return null;
  }

  public users(): number | null {
    const users = parseNum(getText(queryOne(this.dom, "MetadataCard-content")));
    if (users >= 0) return users;

    return null;
  }

  public price(): string | null {
    const price = this._itemprop("price");
    if (price != null) return price;

    return null;
  }

  public priceCurrency(): string | null {
    const priceCurrency = this._itemprop("priceCurrency");
    if (priceCurrency != null) return priceCurrency;

    return null;
  }

  public version(): string | null {
    let version = this._itemprop("version");
    if (version) return version;

    version = parseVersion(
      getText(queryOne(this.dom, "AddonMoreInfo-version")),
    );
    if (version) return version;

    return null;
  }

  public url(): string | null {
    let url = this._itemprop("url") || this._og("og:url");
    if (url) return url;

    const urlElem = findOne(
      (elem) => elem.name === "link" && elem.attribs.rel === "canonical",
      this.dom,
    );
    if (urlElem) {
      url = urlElem.attribs.href;
      if (url) return url;
    }

    return null;
  }

  public image(): string | null {
    return this._itemprop("image") || this._og("og:image") || null;
  }

  public operatingSystem(): string | null {
    return this._itemprop("operatingSystem") || null;
  }
  
  public size(): string | null {
    return getText(queryOne(this.dom, "AddonMoreInfo-filesize")) || null;
  }
  
  public lastUpdated(): string | null {
    return getText(queryOne(this.dom, "AddonMoreInfo-last-updated")) || null;
  }

  public get dom() {
    if (!this._dom) {
      throw new Error(
        "Item not loaded. Please run `await instance.load()` first.`",
      );
    }
    return this._dom;
  }

  private _itemprop(property: string): string | null {
    if (this._itempropMemo[property] === void 0) {
      const itempropElem = findOne(
        (elem) => elem.attribs.itemprop === property,
        this.dom,
      );

      this._itempropMemo[property] =
        itempropElem && itempropElem.attribs.content != null
          ? itempropElem.attribs.content
          : null;
    }

    return this._itempropMemo[property] ?? null;
  }

  private _og(property: string): string | null {
    if (this._ogMemo[property] === void 0) {
      const ogElem = findOne(
        (elem) => elem.attribs.property === property,
        this.dom,
      );

      this._ogMemo[property] =
        ogElem && ogElem.attribs.content != null
          ? ogElem.attribs.content
          : null;
    }

    return this._ogMemo[property];
  }
}

export default Amo;
