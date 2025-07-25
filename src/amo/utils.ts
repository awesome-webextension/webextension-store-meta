import { parseNum } from "../utils/parse";

export const parseRattingValue = (value: unknown): number | null => {
  const num = parseNum(value);
  return num !== null && num >= 0 && num <= 5 ? num : null;
};
