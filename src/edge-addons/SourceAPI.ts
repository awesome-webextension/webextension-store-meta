import { isPlainObject } from "../utils/parse";
import type {
  EdgeAddonsImage,
  EdgeAddonsMeta,
  EdgeAddonsPrivacyData,
} from "./types";

export type EdgeAddonsApiData = Partial<
  Omit<EdgeAddonsMeta, "url" | "logoUrl" | "thumbnailUrl">
> & {
  logoUrl?: string | null;
  thumbnailUrl?: string | null;
};

export class SourceAPI {
  private readonly cache = new Map<keyof EdgeAddonsMeta, unknown>();

  public constructor(
    /** @internal */
    private readonly data: EdgeAddonsApiData,
  ) {}

  public availability(): string[] | null {
    return this.array("availability");
  }

  public activeInstallCount(): number | null {
    return this.number("activeInstallCount");
  }

  public storeProductId(): string | null {
    return this.string("storeProductId");
  }

  public name(): string | null {
    return this.string("name");
  }

  public logoUrl(): string | null {
    return this.urlString("logoUrl");
  }

  public thumbnailUrl(): string | null {
    return this.urlString("thumbnailUrl");
  }

  public description(): string | null {
    return this.string("description");
  }

  public developer(): string | null {
    return this.string("developer");
  }

  public category(): string | null {
    return this.string("category");
  }

  public isInstalled(): boolean | null {
    return this.boolean("isInstalled");
  }

  public crxId(): string | null {
    return this.string("crxId");
  }

  public manifest(): string | null {
    return this.string("manifest");
  }

  public isHavingMatureContent(): boolean | null {
    return this.boolean("isHavingMatureContent");
  }

  public version(): string | null {
    return this.string("version");
  }

  public lastUpdateDate(): number | null {
    return this.number("lastUpdateDate");
  }

  public privacyUrl(): string | null {
    return this.string("privacyUrl");
  }

  public availabilityId(): string | null {
    return this.string("availabilityId");
  }

  public skuId(): string | null {
    return this.string("skuId");
  }

  public locale(): string | null {
    return this.string("locale");
  }

  public market(): string | null {
    return this.string("market");
  }

  public averageRating(): number | null {
    return this.number("averageRating");
  }

  public ratingCount(): number | null {
    return this.number("ratingCount");
  }

  public availableLanguages(): string[] | null {
    return this.array("availableLanguages");
  }

  public metadata(): Record<string, unknown> | null {
    return this.object("metadata");
  }

  public shortDescription(): string | null {
    return this.string("shortDescription");
  }

  public searchKeywords(): string | null {
    return this.string("searchKeywords");
  }

  public screenshots(): EdgeAddonsImage[] | null {
    return this.images("screenshots");
  }

  public videos(): EdgeAddonsImage[] | null {
    return this.images("videos");
  }

  public largePromotionImage(): EdgeAddonsImage | null {
    const value = this.value("largePromotionImage");
    if (!isPlainObject(value)) return null;
    return normalizeImage(value);
  }

  public publisherWebsiteUri(): string | null {
    return this.string("publisherWebsiteUri");
  }

  public isBadgedAsFeatured(): boolean | null {
    return this.boolean("isBadgedAsFeatured");
  }

  public privacyData(): EdgeAddonsPrivacyData | null {
    return this.object("privacyData") as EdgeAddonsPrivacyData | null;
  }

  private value(key: keyof EdgeAddonsMeta): unknown {
    return this.data[key as keyof EdgeAddonsApiData] ?? null;
  }

  private string(key: keyof EdgeAddonsMeta): string | null {
    if (!this.cache.has(key)) {
      const value = this.value(key);
      this.cache.set(key, typeof value === "string" && value !== "" ? value : null);
    }

    return (this.cache.get(key) as string | null) ?? null;
  }

  private urlString(key: "logoUrl" | "thumbnailUrl"): string | null {
    if (!this.cache.has(key)) {
      const value = this.value(key);
      this.cache.set(
        key,
        typeof value === "string" && value !== "" ? normalizeUrl(value) : null,
      );
    }

    return (this.cache.get(key) as string | null) ?? null;
  }

  private number(key: keyof EdgeAddonsMeta): number | null {
    if (!this.cache.has(key)) {
      const value = this.value(key);
      this.cache.set(key, typeof value === "number" ? value : null);
    }

    return (this.cache.get(key) as number | null) ?? null;
  }

  private boolean(key: keyof EdgeAddonsMeta): boolean | null {
    if (!this.cache.has(key)) {
      const value = this.value(key);
      this.cache.set(key, typeof value === "boolean" ? value : null);
    }

    return (this.cache.get(key) as boolean | null) ?? null;
  }

  private array(key: keyof EdgeAddonsMeta): string[] | null {
    if (!this.cache.has(key)) {
      const value = this.value(key);
      this.cache.set(
        key,
        Array.isArray(value) && value.every((item) => typeof item === "string")
          ? value
          : null,
      );
    }

    return (this.cache.get(key) as string[] | null) ?? null;
  }

  private images(key: "screenshots" | "videos"): EdgeAddonsImage[] | null {
    if (!this.cache.has(key)) {
      const value = this.value(key);
      this.cache.set(
        key,
        Array.isArray(value)
          ? value.filter(isPlainObject).map(normalizeImage)
          : null,
      );
    }

    return (this.cache.get(key) as EdgeAddonsImage[] | null) ?? null;
  }

  private object(key: keyof EdgeAddonsMeta): Record<string, unknown> | null {
    if (!this.cache.has(key)) {
      const value = this.value(key);
      this.cache.set(key, isPlainObject(value) ? value : null);
    }

    return (this.cache.get(key) as Record<string, unknown> | null) ?? null;
  }
}

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
