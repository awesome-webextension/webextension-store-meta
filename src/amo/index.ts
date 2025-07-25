import { stringify } from "node:querystring";
import { DomHandler, type Node } from "domhandler";
import { Parser } from "htmlparser2/lib/Parser";
import type { RequestInit } from "undici";
import { fetchText } from "../utils/fetch-text";
import { SourceDOM } from "./SourceDOM";
import { SourceJSONLD } from "./SourceJSONLD";
import { SourceOG } from "./SourceOG";
import { SourceReduxStoreState } from "./SourceReduxStoreState";

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
    return (
      this.sourceReduxStoreState.name() ||
      this.sourceJSONLD.name() ||
      this.sourceDOM.name()
    );
  }

  public description(): string | null {
    return (
      this.sourceReduxStoreState.description() ||
      this.sourceJSONLD.description() ||
      this.sourceOG.description() ||
      this.sourceDOM.description()
    );
  }

  public ratingValue(): number | null {
    return (
      this.sourceReduxStoreState.ratingValue() ||
      this.sourceJSONLD.ratingValue() ||
      this.sourceDOM.ratingValue()
    );
  }

  public ratingCount(): number | null {
    return (
      this.sourceReduxStoreState.ratingCount() ||
      this.sourceJSONLD.ratingCount() ||
      this.sourceDOM.ratingCount()
    );
  }

  public users(): number | null {
    return this.sourceReduxStoreState.users() || this.sourceDOM.users();
  }

  public price(): number | null {
    return this.sourceJSONLD.price();
  }

  public priceCurrency(): string | null {
    return this.sourceJSONLD.priceCurrency();
  }

  public version(): string | null {
    return (
      this.sourceReduxStoreState.version() ||
      this.sourceJSONLD.version() ||
      this.sourceDOM.version()
    );
  }

  public url(): string | null {
    return (
      this.sourceReduxStoreState.url() ||
      this.sourceJSONLD.url() ||
      this.sourceOG.url() ||
      this.sourceDOM.url()
    );
  }

  public image(): string | null {
    return (
      this.sourceReduxStoreState.image() ||
      this.sourceJSONLD.image() ||
      this.sourceOG.image() ||
      this.sourceDOM.image()
    );
  }

  public operatingSystem(): string | null {
    return this.sourceJSONLD.operatingSystem();
  }

  public size(): string | null {
    return this.sourceReduxStoreState.size() || this.sourceDOM.size();
  }

  public lastUpdated(): string | null {
    return (
      this.sourceReduxStoreState.lastUpdated() || this.sourceDOM.lastUpdated()
    );
  }

  /** @internal */
  private _dom?: Node[];

  public get dom() {
    if (!this._dom) {
      throw new Error(
        "Item not loaded. Please run `await instance.load()` first.`",
      );
    }
    return this._dom;
  }

  /** @internal */
  private _sourceDOM?: SourceDOM;
  /** @internal */
  public get sourceDOM(): SourceDOM {
    if (!this._sourceDOM) {
      this._sourceDOM = new SourceDOM(this.dom);
    }
    return this._sourceDOM;
  }

  /** @internal */
  private _sourceJSONLD?: SourceJSONLD;
  /** @internal */
  public get sourceJSONLD(): SourceJSONLD {
    if (!this._sourceJSONLD) {
      this._sourceJSONLD = new SourceJSONLD(this.dom);
    }
    return this._sourceJSONLD;
  }

  /** @internal */
  private _sourceOG?: SourceOG;
  /** @internal */
  public get sourceOG(): SourceOG {
    if (!this._sourceOG) {
      this._sourceOG = new SourceOG(this.dom);
    }
    return this._sourceOG;
  }

  /** @internal */
  private _sourceReduxStoreState?: SourceReduxStoreState;
  /** @internal */
  public get sourceReduxStoreState(): SourceReduxStoreState {
    if (!this._sourceReduxStoreState) {
      this._sourceReduxStoreState = new SourceReduxStoreState(this.dom);
    }
    return this._sourceReduxStoreState;
  }
}

export default Amo;
