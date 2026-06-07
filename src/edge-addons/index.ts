import { parse, stringify } from "node:querystring";
import { DomHandler, type Node } from "domhandler";
import { Parser } from "htmlparser2/lib/Parser";
import type { RequestInit } from "undici";
import { fetchText } from "../utils/fetch-text";
import { SourceAPI, type EdgeAddonsApiData } from "./SourceAPI";
import { SourceDOM } from "./SourceDOM";
import type {
  EdgeAddonsImage,
  EdgeAddonsMeta,
  EdgeAddonsPrivacyData,
} from "./types";

export type { RequestInit };
export type { EdgeAddonsImage, EdgeAddonsMeta, EdgeAddonsPrivacyData };

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

export class EdgeAddons {
  public id: string;
  public options?: RequestInit;
  public qs: string;

  private _data: EdgeAddonsApiData | null = null;
  private _dom: Node[] | null = null;
  private _url: string | null = null;

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
    return this.sourceAPI.availability();
  }

  public activeInstallCount(): number | null {
    return (
      this.sourceAPI.activeInstallCount() ??
      this.sourceDOM.activeInstallCount()
    );
  }

  public storeProductId(): string | null {
    return this.sourceAPI.storeProductId();
  }

  public name(): string | null {
    return this.sourceAPI.name() || this.sourceDOM.name();
  }

  public logoUrl(): string | null {
    return this.sourceAPI.logoUrl();
  }

  public thumbnailUrl(): string | null {
    return this.sourceAPI.thumbnailUrl();
  }

  public description(): string | null {
    return this.sourceAPI.description();
  }

  public developer(): string | null {
    return this.sourceAPI.developer();
  }

  public category(): string | null {
    return this.sourceAPI.category();
  }

  public isInstalled(): boolean | null {
    return this.sourceAPI.isInstalled();
  }

  public crxId(): string | null {
    return this.sourceAPI.crxId();
  }

  public manifest(): string | null {
    return this.sourceAPI.manifest();
  }

  public isHavingMatureContent(): boolean | null {
    return this.sourceAPI.isHavingMatureContent();
  }

  public version(): string | null {
    return this.sourceAPI.version();
  }

  public lastUpdateDate(): number | null {
    return this.sourceAPI.lastUpdateDate();
  }

  public privacyUrl(): string | null {
    return this.sourceAPI.privacyUrl();
  }

  public availabilityId(): string | null {
    return this.sourceAPI.availabilityId();
  }

  public skuId(): string | null {
    return this.sourceAPI.skuId();
  }

  public locale(): string | null {
    return this.sourceAPI.locale();
  }

  public market(): string | null {
    return this.sourceAPI.market();
  }

  public averageRating(): number | null {
    return this.sourceAPI.averageRating() ?? this.sourceDOM.averageRating();
  }

  public ratingCount(): number | null {
    return this.sourceAPI.ratingCount() ?? this.sourceDOM.ratingCount();
  }

  public availableLanguages(): string[] | null {
    return this.sourceAPI.availableLanguages();
  }

  public metadata(): Record<string, unknown> | null {
    return this.sourceAPI.metadata();
  }

  public shortDescription(): string | null {
    return this.sourceAPI.shortDescription();
  }

  public searchKeywords(): string | null {
    return this.sourceAPI.searchKeywords();
  }

  public screenshots(): EdgeAddonsImage[] | null {
    return this.sourceAPI.screenshots();
  }

  public videos(): EdgeAddonsImage[] | null {
    return this.sourceAPI.videos();
  }

  public largePromotionImage(): EdgeAddonsImage | null {
    return this.sourceAPI.largePromotionImage();
  }

  public publisherWebsiteUri(): string | null {
    return this.sourceAPI.publisherWebsiteUri();
  }

  public isBadgedAsFeatured(): boolean | null {
    return this.sourceAPI.isBadgedAsFeatured();
  }

  public privacyData(): EdgeAddonsPrivacyData | null {
    return this.sourceAPI.privacyData();
  }

  public url(): string | null {
    return this.sourceDOM.url();
  }

  private get queryString(): string {
    return this.qs ? `?${this.qs}` : "";
  }

  private get detailUrl(): string {
    return `https://microsoftedge.microsoft.com/addons/detail/${this.id}`;
  }

  /** @internal */
  private _sourceAPI?: SourceAPI;
  /** @internal */
  public get sourceAPI(): SourceAPI {
    if (!this._data) {
      throw new Error(
        "Item not loaded. Please run `await instance.load()` first.`",
      );
    }

    if (!this._sourceAPI) {
      this._sourceAPI = new SourceAPI(this._data);
    }
    return this._sourceAPI;
  }

  /** @internal */
  private _sourceDOM?: SourceDOM;
  /** @internal */
  public get sourceDOM(): SourceDOM {
    if (!this._sourceDOM) {
      this._sourceDOM = new SourceDOM(this.dom, this._url);
    }
    return this._sourceDOM;
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
