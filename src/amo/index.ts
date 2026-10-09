import { stringify } from "node:querystring";
import type { RequestInit } from "undici";
import { fetchText } from "../utils/fetch-text";
import { type AmoApiData, SourceAPI } from "./SourceAPI";

export interface AmoOptions {
  /**
   * Firefox Add-ons extension ID
   * @example "ext-saladict"
   */
  id: string;
  /**
   * Locale for API translations
   */
  locale?: string;
  /**
   * `undici.fetch` options
   * @see {@link https://undici.nodejs.org/#/?id=undicifetchinput-init-promise}
   */
  options?: RequestInit;
  /**
   * @deprecated AMO uses the API only. Page query strings are ignored.
   */
  qs?: Record<string, string> | string;
}

export interface AmoMeta {
  name: string | null;
  description: string | null;
  ratingValue: number | null;
  ratingCount: number | null;
  users: number | null;
  price: number | null;
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

  public constructor(config: AmoOptions) {
    this.config = config || {};
  }

  public static async load(config: AmoOptions): Promise<Amo> {
    const instance = new Amo(config);
    await instance.load();
    return instance;
  }

  public async load(): Promise<Amo> {
    this._apiData = JSON.parse(
      await fetchText(this.apiUrl, this.config.options),
    );
    this._sourceAPI = undefined;

    return this;
  }

  public meta(): AmoMeta {
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
    return this.sourceAPI.name();
  }

  public description(): string | null {
    return this.sourceAPI.description();
  }

  public ratingValue(): number | null {
    return this.sourceAPI.ratingValue();
  }

  public ratingCount(): number | null {
    return this.sourceAPI.ratingCount();
  }

  public users(): number | null {
    return this.sourceAPI.users();
  }

  /** Not provided by the AMO API. */
  public price(): number | null {
    return null;
  }

  /** Not provided by the AMO API. */
  public priceCurrency(): string | null {
    return null;
  }

  public version(): string | null {
    return this.sourceAPI.version();
  }

  public url(): string | null {
    return this.sourceAPI.url();
  }

  public image(): string | null {
    return this.sourceAPI.image();
  }

  /** Not provided by the AMO API. */
  public operatingSystem(): string | null {
    return null;
  }

  public size(): string | null {
    return this.sourceAPI.size();
  }

  public lastUpdated(): string | null {
    return this.sourceAPI.lastUpdated();
  }

  private get apiUrl(): string {
    const qs = this.config.locale
      ? `?${stringify({ lang: this.config.locale })}`
      : "";
    return `https://addons.mozilla.org/api/v5/addons/addon/${encodeURIComponent(
      this.config.id,
    )}/${qs}`;
  }

  /** @internal */
  private _apiData?: AmoApiData;

  /** @internal */
  private _sourceAPI?: SourceAPI;
  /** @internal */
  public get sourceAPI(): SourceAPI {
    if (!this._apiData) {
      throw new Error(
        "Item not loaded. Please run `await instance.load()` first.`",
      );
    }

    if (!this._sourceAPI) {
      this._sourceAPI = new SourceAPI(this._apiData, this.config.locale);
    }
    return this._sourceAPI;
  }
}

export default Amo;
