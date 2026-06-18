import prettyBytes from "pretty-bytes";
import {
  parseNum,
  parseVersion,
  toArray,
  toPlainObject,
  toStr,
} from "../utils/parse";
import { parseRattingValue } from "./utils";

export type AmoApiData = Record<PropertyKey, unknown>;

export class SourceAPI {
  public constructor(
    /** @internal */
    private readonly data: AmoApiData,
    /** @internal */
    private readonly locale?: string,
  ) {}

  public name(): string | null {
    return this.translation(this.data.name);
  }

  public description(): string | null {
    return (
      this.translation(this.data.summary) ||
      this.translation(this.data.description)
    );
  }

  public ratingValue(): number | null {
    return parseRattingValue(toPlainObject(this.data.ratings)?.average);
  }

  public ratingCount(): number | null {
    return parseNum(toPlainObject(this.data.ratings)?.count);
  }

  public users(): number | null {
    return parseNum(this.data.average_daily_users);
  }

  public version(): string | null {
    return parseVersion(toPlainObject(this.data.current_version)?.version);
  }

  public url(): string | null {
    return toStr(this.data.url);
  }

  public image(): string | null {
    const preview = toArray(this.data.previews)
      ?.map(toPlainObject)
      .find((item) => toStr(item?.image_url));

    return toStr(preview?.image_url) || toStr(this.data.icon_url);
  }

  public size(): string | null {
    const size = parseNum(
      toPlainObject(toPlainObject(this.data.current_version)?.file)?.size,
    );
    return size ? prettyBytes(size) : null;
  }

  public lastUpdated(): string | null {
    return (
      toStr(this.data.last_updated) ||
      toStr(
        toPlainObject(toPlainObject(this.data.current_version)?.file)?.created,
      )
    );
  }

  private translation(value: unknown): string | null {
    const directValue = toStr(value);
    if (directValue) return directValue;

    const translations = toPlainObject(value);
    if (!translations) return null;

    const defaultLocale =
      toStr(this.data.default_locale) || toStr(translations._default);
    const locales = [
      this.locale,
      defaultLocale,
      "en-US",
      ...Object.keys(translations),
    ];

    for (const locale of locales) {
      if (!locale || locale === "_default") continue;

      const translation = toStr(translations[locale]);
      if (translation) return translation;
    }

    return null;
  }
}
