const fetch = require('node-fetch')

/**
 * @param {string} url
 * @param {object} options - node-fetch options {@link https://www.npmjs.com/package/node-fetch#options}
 */
module.exports = async function fetchText(url, options) {
  const response = await fetch(url, options)

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${url}`)
  }

  return response.text()
}
