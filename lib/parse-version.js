/**
 * @param {string|undefined|null} str
 * @returns {string|null}
 */
module.exports = function parseVersion(str) {
  if (!str) return null
  const match = /v?(\d+(?:\.\d+)+)/.exec(str)
  return match ? match[1] : null
}
