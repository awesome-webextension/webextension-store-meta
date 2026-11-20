import { isTag, isText, type Node } from "domhandler";
import { findOne, getText, queryOne } from "../utils/dom";
import { toArray } from "../utils/parse";

export interface ChromeWebStoreMetrics {
  ratingValue: number | null;
  ratingCount: number | null;
  users: number | null;
}

export function parseMetricsFromDOM(
  dom: Node[],
  id: string,
): ChromeWebStoreMetrics {
  const language = findOne((el) => el.name === "html", dom)?.attribs.lang;
  const { parseNumber, parseCount } = createNumberParser(language);
  const rating = queryOne(dom, "j3zrsd");
  const ratingValue = parseNumber(getText(rating && queryOne(rating, "Vq0ZA")));
  const legacyUsers = queryOne(dom, "F9iKBc");
  const legacyRatingCount = rating && queryOne(rating, "xJEoWe");

  if (legacyUsers || legacyRatingCount) {
    const users = legacyUsers?.children
      .filter(isText)
      .map((node) => parseCount(getText(node)))
      .find((count) => count !== null);
    return {
      ratingValue,
      ratingCount: parseCount(getText(legacyRatingCount)),
      users: users ?? null,
    };
  }

  const metrics = rating && queryOne(rating, "NipEU");
  const [ratingTile, usersTile, updatedTile] = (metrics?.children ?? [])
    .filter(isTag)
    .filter((el) => /(?:^|\s)x5MnV(?:\s|$)/.test(el.attribs.class ?? ""));
  const reviewsLink =
    ratingTile &&
    findOne(
      (el) =>
        el.name === "a" &&
        el.attribs.href?.split(/[?#]/, 1)[0].endsWith(`/${id}/reviews`),
      ratingTile.children,
      false,
    );

  // The user and update tiles share their markup. Require both positions.
  const usersValue = usersTile && updatedTile && queryOne(usersTile, "MH16jb");
  return {
    ratingValue,
    ratingCount: parseCount(getText(reviewsLink)),
    users: parseCount(getText(usersValue)),
  };
}

export function parseCountsFromPageData(
  dom: Node[],
  id: string,
): Pick<ChromeWebStoreMetrics, "ratingCount" | "users"> | null {
  const script = findOne(
    (el) =>
      el.name === "script" &&
      /^AF_initDataCallback\(\{\s*key:\s*['"]ds:0['"]/.test(getText(el)),
    dom,
  );
  const data = /,\s*data:\s*(\[[\s\S]*\])\s*,\s*sideChannel:/.exec(
    getText(script),
  )?.[1];
  if (!data) return null;

  try {
    const detail = toArray(toArray(JSON.parse(data))?.[0]);
    if (detail?.[0] !== id) return null;
    return {
      ratingCount: validCount(detail[4]),
      users: validCount(detail[14]),
    };
  } catch {
    return null;
  }
}

function validCount(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
    ? value
    : null;
}

function createNumberParser(language = "en") {
  let format: Intl.NumberFormat;
  try {
    format = new Intl.NumberFormat(language);
  } catch {
    format = new Intl.NumberFormat("en");
  }

  const parts = format.formatToParts(9876543210.5);
  const group = parts.find((part) => part.type === "group")?.value ?? ",";
  const decimal = parts.find((part) => part.type === "decimal")?.value ?? ".";
  const digits = Array.from(
    parts
      .filter((part) => part.type === "integer")
      .map((part) => part.value)
      .join(""),
  );
  const compact = new Intl.NumberFormat(format.resolvedOptions().locale, {
    notation: "compact",
  });

  function parseNumber(text: string): number | null {
    const normalized = text
      .replaceAll(group, "")
      .replaceAll(decimal, ".")
      .replace(/\s/gu, "")
      .replace(/\p{Decimal_Number}/gu, (character) => {
        const index = digits.indexOf(character);
        return index < 0 ? character : String(9 - index);
      });
    if (!/^\d+(?:\.\d*)?$/.test(normalized)) return null;
    const value = Number(normalized);
    return Number.isFinite(value) ? value : null;
  }

  function parseCount(text: string): number | null {
    const match =
      /\p{Decimal_Number}+(?:[.,'’\u066b\u066c\p{Zs}]\p{Decimal_Number}+)*/u.exec(
        text,
      );
    if (!match) return null;
    const value = parseNumber(match[0]);
    if (value === null) return null;

    const suffix = text
      .slice(match.index + match[0].length)
      .trimStart()
      .toLowerCase();
    if (suffix) {
      for (let magnitude = 1000; magnitude <= 1e12; magnitude *= 10) {
        const unit = compact
          .formatToParts(magnitude)
          .find((part) => part.type === "compact")
          ?.value.toLowerCase();
        if (
          unit &&
          suffix.startsWith(unit) &&
          !(/[a-z]$/i.test(unit) && /^[a-z]/i.test(suffix.slice(unit.length)))
        ) {
          return validCount(Math.round(value * magnitude));
        }
      }
    }
    return validCount(value);
  }

  return { parseNumber, parseCount };
}
