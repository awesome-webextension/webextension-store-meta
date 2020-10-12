/**
 * @param {string|undefined|null} str
 * @returns {number}
 */
module.exports = function parseNum(str) {
  if (!str) return NaN

  return parseFloat(
    str.replace(/^[^\d.]*/, '').replace(/^[\d,]+/g, (m) => m.replace(/,/g, ''))
  )
}
