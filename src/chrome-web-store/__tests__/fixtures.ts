import { fetchText } from "../../utils/fetch-text";

const IDs = [
  "cdonnmffkdaoajfknoeeecmchibpmkmg",
  // https://github.com/awesome-webextension/webextension-store-meta/pull/3
  "ekbmhggedfdlajiikminikhcjffbleac",
];

export async function fixtures(): Promise<string[]> {
  const exts = new Set(IDs);

  if (process.env.CI) {
    const idMatcher = /\/detail\/(?:[^/]+\/)?([\d\w]+)/g;
    const html = await fetchText("https://chromewebstore.google.com/");
    const initialSize = exts.size;

    for (
      let match = idMatcher.exec(html);
      exts.size - initialSize < 5 && match;
      match = idMatcher.exec(html)
    ) {
      exts.add(match[1]);
    }

    if (exts.size - initialSize <= 0) {
      throw new Error("No extensions found");
    }
  }

  return [...exts.values()];
}
