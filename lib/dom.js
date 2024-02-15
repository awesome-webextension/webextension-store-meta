const { isTag, isCDATA, isText } = require('domhandler')

/**
 * Finds one element in a tree that passes a test.
 *
 * @category Querying
 * @param {(elem: import("domhandler").Element) => boolean} test Function to test nodes on.
 * @param {(ParentNode | ChildNode)[]} nodes Node or array of nodes to search.
 * @param recurse Also consider child nodes.
 * @returns {import("domhandler").Element | null} The first node that passes `test`.
 */
function findOne(test, nodes, recurse = true) {
  if (!Array.isArray(nodes)) {
    nodes = [nodes]
  }
  let elem = null

  for (let i = 0; i < nodes.length && !elem; i++) {
    const node = nodes[i]
    if (!isTag(node)) {
      continue
    } else if (test(node)) {
      elem = node
    } else if (recurse && node.children.length > 0) {
      elem = findOne(test, node.children, true)
    }
  }

  return elem
}

module.exports.findOne = findOne

/**
 * Get a node's trimmed inner text.
 * domutils's stringify module is too heavy.
 *
 * @param {Node|Node[]} node Node to get the inner text of.
 * @returns {string}`node`'s trimmed inner text.
 */
module.exports.getText = function getText(node) {
  if (!node) return ''
  if (Array.isArray(node)) return node.map(getText).join('')
  if (isTag(node)) return node.name === 'br' ? '\n' : getText(node.children)
  if (isCDATA(node)) return getText(node.children)
  if (isText(node)) return node.data.trim()
  return ''
}

/**
 * @param {Node} node
 * @param {string} className
 * @param {string} [tagName]
 */
module.exports.queryOne = function queryOne(node, className, tagName) {
  const tester = new RegExp(`(?:^|\\s)${className}(?:\\s|$)`)

  return findOne(
    (elem) =>
      elem.attribs.class &&
      (!tagName || tagName === elem.name) &&
      tester.test(elem.attribs.class),
    node,
  )
}
