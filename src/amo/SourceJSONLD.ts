import type { DataNode, Node } from "domhandler";
import { findOne } from "../utils/dom";
import {
  parseNum,
  parseVersion,
  toPlainObject,
  toStr,
  tryJSONParseObject,
} from "../utils/parse";
import { parseRattingValue } from "./utils";

export class SourceJSONLD {
  /** @internal */
  private data?: Record<PropertyKey, unknown>;

  public constructor(
    /** @internal */
    private readonly dom: Node[],
  ) {
    const schema = findOne(
      (elem) =>
        elem.name === "script" && elem.attribs.type === "application/ld+json",
      this.dom,
    );
    if (schema) {
      this.data = tryJSONParseObject((schema.children[0] as DataNode)?.data);
    }
  }

  public name(): string | null {
    return toStr(this.data?.name);
  }

  public description(): string | null {
    return toStr(this.data?.description);
  }

  public ratingValue(): number | null {
    return parseRattingValue(
      toPlainObject(this.data?.aggregateRating)?.ratingValue,
    );
  }

  public ratingCount(): number | null {
    return parseNum(toPlainObject(this.data?.aggregateRating)?.ratingCount);
  }

  public price(): number | null {
    return parseNum(toPlainObject(this.data?.offers)?.price);
  }

  public priceCurrency(): string | null {
    return toStr(toPlainObject(this.data?.offers)?.priceCurrency);
  }

  public version(): string | null {
    return parseVersion(this.data?.version);
  }

  public url(): string | null {
    return toStr(this.data?.url);
  }

  public image(): string | null {
    return toStr(this.data?.image);
  }

  public operatingSystem(): string | null {
    return toStr(this.data?.operatingSystem);
  }
}
