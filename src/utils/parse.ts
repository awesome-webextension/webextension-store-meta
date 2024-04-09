export const parseNum = (str?: string | number | null): number => {
  if (typeof str === "number") return str;
  if (!str) return Number.NaN;

  return Number.parseFloat(
    str.replace(/^[^\d.]*/, "").replace(/^[\d,]+/g, (m) => m.replace(/,/g, "")),
  );
};

export const parseVersion = (str?: string | null): string | null => {
  if (!str) return null;
  const match = /v?(\d+(?:\.\d+)+)/.exec(str);
  return match ? match[1] : null;
};
