import { fetch } from "undici";

const IDs = ["ublock-origin", "duckduckgo-for-firefox"];

export async function fixtures(): Promise<string[]> {
  const exts = new Set(IDs);

  if (process.env.CI) {
    const idMatcher = /\/firefox\/addon\/([^/?]+)/g;
    const html = await fetch(
      "https://addons.mozilla.org/firefox/extensions/",
    ).then((res) => res.text());
    for (
      let match = idMatcher.exec(html);
      exts.size < 5 && match !== null;
      match = idMatcher.exec(html)
    ) {
      exts.add(match[1]);
    }
  }

  return [...exts.values()];
}
