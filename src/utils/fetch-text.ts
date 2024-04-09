import { type RequestInit, fetch } from "undici";

const DEFAULT_OPTIONS = {
  headers: {
    "User-Agent": "Mozilla/5.0",
  },
};

export const fetchText = async (
  url: string,
  options: RequestInit = DEFAULT_OPTIONS,
): Promise<string> => {
  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${url}`);
  }

  return response.text();
};
