import type { Node } from "domhandler";
import { findOne, getText, queryOne } from "../utils/dom";
import { parseNum, parseVersion } from "../utils/parse";

export class SourceDOM {
  public constructor(
    /** @internal */
    private readonly dom: Node[],
  ) {}

  public name(): string | null {
    const title = queryOne(this.dom, "AddonTitle");
    if (title) {
      return getText(title.children[0]) || null;
    }
    return null;
  }

  public description(): string | null {
    let des = getText(queryOne(this.dom, "Addon-summary"));
    if (des) return des;

    const desElem = queryOne(this.dom, "Description");
    if (desElem) {
      des = getText(desElem);
      if (des) return des;
    }

    return null;
  }

  public ratingValue(): number | null {
    if (this.badges) {
      const elm = findOne(
        (elem) => elem.attribs["data-testid"]?.startsWith("badge-star-"),
        this.badges,
      );
      if (elm) {
        return parseNum(getText(elm)?.replace(/\([^)]+\)/, ""));
      }
    }
    return null;
  }

  public ratingCount(): number | null {
    if (this.badges) {
      const elm = findOne(
        (elem) => elem.attribs["data-testid"]?.startsWith("badge-star-"),
        this.badges,
      );
      if (elm) {
        return parseNum(getText(elm)?.match(/\(([^)]+)\)/)?.[1]);
      }
    }
    return null;
  }

  public users(): number | null {
    if (this.badges) {
      const elm = findOne(
        (elem) => elem.attribs["data-testid"]?.startsWith("badge-user-"),
        this.badges,
      );
      if (elm) {
        return parseNum(getText(elm));
      }
    }
    return null;
  }

  public version(): string | null {
    return parseVersion(getText(queryOne(this.dom, "AddonMoreInfo-version")));
  }

  public url(): string | null {
    return (
      findOne(
        (elem) => elem.name === "link" && elem.attribs.rel === "canonical",
        this.dom,
      )?.attribs.href || null
    );
  }

  public image(): string | null {
    return queryOne(this.dom, "ScreenShots-image", "img")?.attribs.src || null;
  }

  public size(): string | null {
    return getText(queryOne(this.dom, "AddonMoreInfo-filesize")) || null;
  }

  public lastUpdated(): string | null {
    return getText(queryOne(this.dom, "AddonMoreInfo-last-updated")) || null;
  }

  /** @internal */
  private _badges?: Node | null;

  /** @internal */
  private get badges(): Node | null {
    if (this._badges === undefined) {
      this._badges = queryOne(this.dom, "AddonBadges");
    }
    return this._badges;
  }
}
