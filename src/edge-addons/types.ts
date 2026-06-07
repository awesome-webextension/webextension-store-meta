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
