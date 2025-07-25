import type { Node } from "domhandler";
import { findOne } from "../utils/dom";

export class SourceOG {
  public constructor(
    /** @internal */
    private readonly dom: Node[],
  ) {}

  public description(): string | null {
    return this.find("og:description");
  }

  public url(): string | null {
    return this.find("og:url");
  }

  public image(): string | null {
    return this.find("og:image");
  }

  /** @internal */
  private find(property: string): string | null {
    const ogElem = findOne(
      (elem) => elem.attribs.property === property,
      this.dom,
    );
    return ogElem && ogElem.attribs.content != null
      ? ogElem.attribs.content
      : null;
  }
}
