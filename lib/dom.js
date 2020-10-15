const { isTag, isCDATA, isText } = require('domutils/lib/tagtypes')
const { findOne } = require('domutils/lib/querying')

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
    node
  )
}
