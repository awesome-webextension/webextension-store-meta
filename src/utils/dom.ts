import { type Element, type Node, isCDATA, isTag, isText } from "domhandler";

export const findOne = (
  test: (el: Element) => boolean,
  maybeNode: Node | Node[],
  recurse = true,
): Element | null => {
  const nodes = Array.isArray(maybeNode) ? maybeNode : [maybeNode];
  let elem = null;

  for (let i = 0; i < nodes.length && !elem; i++) {
    const node = nodes[i];
    if (!isTag(node)) {
      continue;
    }
    if (test(node)) {
      elem = node;
    } else if (recurse && node.children.length > 0) {
      elem = findOne(test, node.children, true);
    }
  }

  return elem;
};

/**
 * Get a node's trimmed inner text.
 * domutils's stringify module is too heavy.
 *
 * @param node Node to get the inner text of.
 * @returns `node`'s trimmed inner text.
 */
export const getText = (node?: Node | Node[] | null): string => {
  if (!node) return "";
  if (Array.isArray(node)) return node.map(getText).join("");
  if (isTag(node)) return node.name === "br" ? "\n" : getText(node.children);
  if (isCDATA(node)) return getText(node.children);
  if (isText(node)) return node.data.trim();
  return "";
};

export const queryOne = (
  node: Node | Node[],
  className: string,
  tagName?: string,
): Element | null => {
  const tester = new RegExp(`(?:^|\\s)${className}(?:\\s|$)`);

  return findOne(
    (elem) =>
      !!elem.attribs.class &&
      (!tagName || tagName === elem.name) &&
      tester.test(elem.attribs.class),
    node,
  );
};
