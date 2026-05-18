import { parse, stringify } from "node:querystring";
import { DomHandler, type Node } from "domhandler";
import { Parser } from "htmlparser2/lib/Parser";
import type { RequestInit } from "undici";
import { findOne, getText } from "../utils/dom";
import { fetchText } from "../utils/fetch-text";
import { isPlainObject } from "../utils/parse";

export type { RequestInit };

export interface EdgeAddonsImage {
  caption?: string;
  imagePurpose?: string;
  uri?: string;
  [key: string]: unknown;
}

export interface EdgeAddonsPrivacyData {
  privacyPolicyRequired?: boolean;
  dataUsageList?: unknown[];
  disclosureList?: unknown[];
  [key: string]: unknown;
}

export interface EdgeAddonsMeta {
  availability: string[] | null;
  activeInstallCount: number | null;
  storeProductId: string | null;
  name: string | null;
  logoUrl: string | null;
  thumbnailUrl: string | null;
  description: string | null;
  developer: string | null;
  category: string | null;
  isInstalled: boolean | null;
  crxId: string | null;
  manifest: string | null;
  isHavingMatureContent: boolean | null;
  version: string | null;
  lastUpdateDate: number | null;
  privacyUrl: string | null;
  availabilityId: string | null;
  skuId: string | null;
  locale: string | null;
  market: string | null;
  averageRating: number | null;
  ratingCount: number | null;
  availableLanguages: string[] | null;
  metadata: Record<string, unknown> | null;
  shortDescription: string | null;
  searchKeywords: string | null;
  screenshots: EdgeAddonsImage[] | null;
  videos: EdgeAddonsImage[] | null;
  largePromotionImage: EdgeAddonsImage | null;
  publisherWebsiteUri: string | null;
  isBadgedAsFeatured: boolean | null;
  privacyData: EdgeAddonsPrivacyData | null;
  url: string | null;
}

export interface EdgeAddonsOptions {
  /**
   * Microsoft Edge Add-ons extension ID
   * @example "cnlefmmeadmemmdciolhbnfeacpdfbkd"
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

type EdgeAddonsApiData = Partial<
  Omit<EdgeAddonsMeta, "url" | "logoUrl" | "thumbnailUrl">
> & {
  logoUrl?: string | null;
  thumbnailUrl?: string | null;
};

export class EdgeAddons {
  public id: string;
  public options?: RequestInit;
  public qs: string;

  private _data: EdgeAddonsApiData | null = null;
  private _dom: Node[] | null = null;
  private _url: string | null = null;
  private _cache = new Map<keyof EdgeAddonsMeta, unknown>();

  public constructor({ id, options, qs }: EdgeAddonsOptions) {
    this.id = id;
    this.options = options;
    this.qs = stringify(
      typeof qs === "string" ? parse(qs.replace(/^\?/, "")) : qs || {},
    );
  }

  static async load(options: EdgeAddonsOptions): Promise<EdgeAddons> {
    const instance = new EdgeAddons(options);
    await instance.load();
    return instance;
  }

  async load(): Promise<EdgeAddons> {
    const apiUrl = `https://microsoftedge.microsoft.com/addons/getproductdetailsbycrxid/${this.id}${this.queryString}`;

    try {
      this._data = JSON.parse(await fetchText(apiUrl, this.options));
      this._url = this.detailUrl;
      this._dom = [];
      return this;
    } catch (_) {
      this._data = {};
    }

    try {
      const html = await fetchText(
        `${this.detailUrl}${this.queryString}`,
        this.options,
      );

      const handler = new DomHandler();
      new Parser(handler).end(html);

      this._dom = handler.dom;
      this._url = this.detailUrl;
    } catch (_) {
      this._dom = [];
      this._url = null;
    }

    return this;
  }

  meta(): EdgeAddonsMeta {
    return {
      availability: this.availability(),
      activeInstallCount: this.activeInstallCount(),
      storeProductId: this.storeProductId(),
      name: this.name(),
      logoUrl: this.logoUrl(),
      thumbnailUrl: this.thumbnailUrl(),
      description: this.description(),
      developer: this.developer(),
      category: this.category(),
      isInstalled: this.isInstalled(),
      crxId: this.crxId(),
      manifest: this.manifest(),
      isHavingMatureContent: this.isHavingMatureContent(),
      version: this.version(),
      lastUpdateDate: this.lastUpdateDate(),
      privacyUrl: this.privacyUrl(),
      availabilityId: this.availabilityId(),
      skuId: this.skuId(),
      locale: this.locale(),
      market: this.market(),
      averageRating: this.averageRating(),
      ratingCount: this.ratingCount(),
      availableLanguages: this.availableLanguages(),
      metadata: this.metadata(),
      shortDescription: this.shortDescription(),
      searchKeywords: this.searchKeywords(),
      screenshots: this.screenshots(),
      videos: this.videos(),
      largePromotionImage: this.largePromotionImage(),
      publisherWebsiteUri: this.publisherWebsiteUri(),
      isBadgedAsFeatured: this.isBadgedAsFeatured(),
      privacyData: this.privacyData(),
      url: this.url(),
    };
  }

  public availability(): string[] | null {
    return this._array("availability");
  }

  public activeInstallCount(): number | null {
    return this._number("activeInstallCount", () =>
      this._parseMetaNumber("userInteractionCount"),
    );
  }

  public storeProductId(): string | null {
    return this._string("storeProductId");
  }

  public name(): string | null {
    return this._string("name", () => this._title());
  }

  public logoUrl(): string | null {
    return this._urlString("logoUrl");
  }

  public thumbnailUrl(): string | null {
    return this._urlString("thumbnailUrl");
  }

  public description(): string | null {
    return this._string("description");
  }

  public developer(): string | null {
    return this._string("developer");
  }

  public category(): string | null {
    return this._string("category");
  }

  public isInstalled(): boolean | null {
    return this._boolean("isInstalled");
  }

  public crxId(): string | null {
    return this._string("crxId");
  }

  public manifest(): string | null {
    return this._string("manifest");
  }

  public isHavingMatureContent(): boolean | null {
    return this._boolean("isHavingMatureContent");
  }

  public version(): string | null {
    return this._string("version");
  }

  public lastUpdateDate(): number | null {
    return this._number("lastUpdateDate");
  }

  public privacyUrl(): string | null {
    return this._string("privacyUrl");
  }

  public availabilityId(): string | null {
    return this._string("availabilityId");
  }

  public skuId(): string | null {
    return this._string("skuId");
  }

  public locale(): string | null {
    return this._string("locale");
  }

  public market(): string | null {
    return this._string("market");
  }

  public averageRating(): number | null {
    return this._number("averageRating", () =>
      this._parseMetaNumber("ratingValue"),
    );
  }

  public ratingCount(): number | null {
    return this._number("ratingCount", () =>
      this._parseMetaNumber("ratingCount"),
    );
  }

  public availableLanguages(): string[] | null {
    return this._array("availableLanguages");
  }

  public metadata(): Record<string, unknown> | null {
    return this._object("metadata");
  }

  public shortDescription(): string | null {
    return this._string("shortDescription");
  }

  public searchKeywords(): string | null {
    return this._string("searchKeywords");
  }

  public screenshots(): EdgeAddonsImage[] | null {
    return this._images("screenshots");
  }

  public videos(): EdgeAddonsImage[] | null {
    return this._images("videos");
  }

  public largePromotionImage(): EdgeAddonsImage | null {
    const value = this._value("largePromotionImage");
    if (!isPlainObject(value)) return null;
    return normalizeImage(value);
  }

  public publisherWebsiteUri(): string | null {
    return this._string("publisherWebsiteUri");
  }

  public isBadgedAsFeatured(): boolean | null {
    return this._boolean("isBadgedAsFeatured");
  }

  public privacyData(): EdgeAddonsPrivacyData | null {
    return this._object("privacyData") as EdgeAddonsPrivacyData | null;
  }

  public url(): string | null {
    if (!this._cache.has("url")) {
      this._cache.set("url", this._url);
    }

    return (this._cache.get("url") as string | null) ?? null;
  }

  private get queryString(): string {
    return this.qs ? `?${this.qs}` : "";
  }

  private get detailUrl(): string {
    return `https://microsoftedge.microsoft.com/addons/detail/${this.id}`;
  }

  private _value(key: keyof EdgeAddonsMeta): unknown {
    if (!this._data) {
      throw new Error(
        "Item not loaded. Please run `await instance.load()` first.`",
      );
    }

    return this._data[key as keyof EdgeAddonsApiData] ?? null;
  }

  private _string(
    key: keyof EdgeAddonsMeta,
    fallback?: () => string | null,
  ): string | null {
    if (!this._cache.has(key)) {
      const value = this._value(key);
      this._cache.set(
        key,
        typeof value === "string" && value !== ""
          ? value
          : (fallback?.() ?? null),
      );
    }

    return (this._cache.get(key) as string | null) ?? null;
  }

  private _urlString(key: "logoUrl" | "thumbnailUrl"): string | null {
    if (!this._cache.has(key)) {
      const value = this._value(key);
      this._cache.set(
        key,
        typeof value === "string" && value !== "" ? normalizeUrl(value) : null,
      );
    }

    return (this._cache.get(key) as string | null) ?? null;
  }

  private _number(
    key: keyof EdgeAddonsMeta,
    fallback?: () => number | null,
  ): number | null {
    if (!this._cache.has(key)) {
      const value = this._value(key);
      this._cache.set(
        key,
        typeof value === "number" ? value : (fallback?.() ?? null),
      );
    }

    return (this._cache.get(key) as number | null) ?? null;
  }

  private _boolean(key: keyof EdgeAddonsMeta): boolean | null {
    if (!this._cache.has(key)) {
      const value = this._value(key);
      this._cache.set(key, typeof value === "boolean" ? value : null);
    }

    return (this._cache.get(key) as boolean | null) ?? null;
  }

  private _array(key: keyof EdgeAddonsMeta): string[] | null {
    if (!this._cache.has(key)) {
      const value = this._value(key);
      this._cache.set(
        key,
        Array.isArray(value) && value.every((item) => typeof item === "string")
          ? value
          : null,
      );
    }

    return (this._cache.get(key) as string[] | null) ?? null;
  }

  private _images(key: "screenshots" | "videos"): EdgeAddonsImage[] | null {
    if (!this._cache.has(key)) {
      const value = this._value(key);
      this._cache.set(
        key,
        Array.isArray(value)
          ? value.filter(isPlainObject).map(normalizeImage)
          : null,
      );
    }

    return (this._cache.get(key) as EdgeAddonsImage[] | null) ?? null;
  }

  private _object(key: keyof EdgeAddonsMeta): Record<string, unknown> | null {
    if (!this._cache.has(key)) {
      const value = this._value(key);
      this._cache.set(key, isPlainObject(value) ? value : null);
    }

    return (this._cache.get(key) as Record<string, unknown> | null) ?? null;
  }

  private _title(): string | null {
    const title = getText(findOne((el) => el.name === "title", this.dom));

    return title.replace(/\s*-\s*Microsoft Edge Add-ons\s*$/, "") || null;
  }

  private _parseMetaNumber(itemprop: string): number | null {
    const value = findOne(
      (el) =>
        el.name === "meta" &&
        el.attribs.itemprop?.toLowerCase() === itemprop.toLowerCase(),
      this.dom,
    )?.attribs.content;

    if (!value) return null;

    const number = Number(value.replace(/,/g, ""));
    return Number.isNaN(number) ? null : number;
  }

  private get dom() {
    if (!this._dom) {
      throw new Error(
        "Item not loaded. Please run `await instance.load()` first.`",
      );
    }
    return this._dom;
  }
}

export default EdgeAddons;

function normalizeUrl(url: string): string {
  return url.startsWith("//") ? `https:${url}` : url;
}

function normalizeImage(image: Record<string, unknown>): EdgeAddonsImage {
  const result: EdgeAddonsImage = { ...image };
  if (typeof image.uri === "string") {
    result.uri = normalizeUrl(image.uri);
  }
  return result;
}
