export const parseNum = (str: unknown): number | null => {
  const num =
    typeof str === "number"
      ? str
      : str
        ? Number.parseFloat(
            String(str)
              .replace(/^[^\d.]*/, "")
              .replace(/^[\d,]+/g, (m) => m.replace(/,/g, "")),
          )
        : NaN;
  return Number.isNaN(num) ? null : num;
};

export const parseVersion = (str?: unknown): string | null => {
  if (typeof str !== "string" || !str) return null;
  const match = /v?(\d+(?:\.\d+)+)/.exec(str);
  return match ? match[1] : null;
};

export const isPlainObject = (
  value: unknown,
): value is Record<PropertyKey, unknown> =>
  !!value && value.constructor === Object;

export const toPlainObject = (
  value: unknown,
): Record<PropertyKey, unknown> | undefined => {
  if (isPlainObject(value)) {
    return value;
  }
};

export const toArray = (value: unknown): unknown[] | undefined => {
  if (Array.isArray(value)) {
    return value;
  }
};

export const toStr = (value: unknown): string | null =>
  (typeof value === "string" && value.trim()) || null;

export const tryJSONParseObject = (
  str: string,
): Record<PropertyKey, unknown> | undefined => {
  try {
    return toPlainObject(JSON.parse(str));
  } catch (_e) {
    return;
  }
};
