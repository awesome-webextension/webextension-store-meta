import type { Node } from "domhandler";
import { findOne, getText } from "../utils/dom";

export class SourceDOM {
  public constructor(
    /** @internal */
    private readonly dom: Node[],
    /** @internal */
    private readonly detailUrl: string | null,
  ) {}

  public activeInstallCount(): number | null {
    return this.parseMetaNumber("userInteractionCount");
  }

  public name(): string | null {
    const title = getText(findOne((el) => el.name === "title", this.dom));
    return title.replace(/\s*-\s*Microsoft Edge Add-ons\s*$/, "") || null;
  }

  public averageRating(): number | null {
    return this.parseMetaNumber("ratingValue");
  }

  public ratingCount(): number | null {
    return this.parseMetaNumber("ratingCount");
  }

  public url(): string | null {
    return this.detailUrl;
  }

  private parseMetaNumber(itemprop: string): number | null {
    const value = findOne(
      (el) =>
        el.name === "meta" &&
        el.attribs.itemprop?.toLowerCase() === itemprop.toLowerCase(),
      this.dom,
    )?.attribs.content;

    if (!value) return null;

    const number = Number(value.replace(/,/g, ""));
    return Number.isNaN(number) ? null : number;
  }
}
