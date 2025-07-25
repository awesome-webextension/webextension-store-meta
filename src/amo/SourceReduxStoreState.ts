import type { DataNode, Node } from "domhandler";
import prettyBytes from "pretty-bytes";
import { findOne } from "../utils/dom";
import {
  parseNum,
  parseVersion,
  toArray,
  toPlainObject,
  toStr,
  tryJSONParseObject,
} from "../utils/parse";
import { parseRattingValue } from "./utils";

export class SourceReduxStoreState {
  /** @internal */
  private addonInfo?: Record<PropertyKey, unknown>;
  /** @internal */
  private versionInfo?: Record<PropertyKey, unknown>;

  public constructor(
    /** @internal */
    private readonly dom: Node[],
  ) {
    const elm = findOne(
      (el) => el.name === "script" && el.attribs.id === "redux-store-state",
      this.dom,
    );
    if (elm) {
      const state = tryJSONParseObject((elm.children[0] as DataNode)?.data);
      const ids = toPlainObject(toPlainObject(state?.addons)?.byID);
      if (ids) {
        this.addonInfo = toPlainObject(Object.values(ids)[0]);
      }
      const versionId = this.addonInfo?.currentVersionId;
      if (typeof versionId === "number" || typeof versionId === "string") {
        this.versionInfo = toPlainObject(
          toPlainObject(toPlainObject(state?.versions)?.byId)?.[versionId],
        );
      }
    }
  }

  public name(): string | null {
    return toStr(this.addonInfo?.name);
  }

  public description(): string | null {
    return toStr(this.addonInfo?.description);
  }

  public ratingValue(): number | null {
    return parseRattingValue(toPlainObject(this.addonInfo?.ratings)?.average);
  }

  public ratingCount(): number | null {
    return parseNum(toPlainObject(this.addonInfo?.ratings)?.count);
  }

  public users(): number | null {
    return parseNum(this.addonInfo?.average_daily_users);
  }

  public version(): string | null {
    return parseVersion(this.versionInfo?.version);
  }

  public url(): string | null {
    return toStr(this.addonInfo?.url);
  }

  public image(): string | null {
    return toStr(toPlainObject(toArray(this.addonInfo?.previews)?.[0])?.src);
  }

  public size(): string | null {
    const versionId = this.addonInfo?.currentVersionId;
    if (typeof versionId === "number" || typeof versionId === "string") {
      const size = parseNum(toPlainObject(this.versionInfo?.file)?.size);
      if (size) {
        return prettyBytes(size);
      }
    }
    return null;
  }

  public lastUpdated(): string | null {
    return toStr(toPlainObject(this.versionInfo?.file)?.created);
  }
}
