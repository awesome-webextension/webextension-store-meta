const fetch = require('node-fetch')
const HttpsProxyAgent = require('https-proxy-agent')
const { argv } = require('yargs')

const proxyAgent =
  typeof argv.proxy === 'string' ? new HttpsProxyAgent(argv.proxy) : undefined

/**
 * @param {string} url
 * @param {object} options - node-fetch options {@link https://www.npmjs.com/package/node-fetch#options}
 */
module.exports = async function fetchText(url, options) {
  const headers = new fetch.Headers((options && options.headers) || {})
  if (!headers.has('User-Agent')) {
    const UserAgent = require('user-agents')
    headers.set('User-Agent', `${new UserAgent()}`)
  }

  const response = await fetch(
    url,
    Object.assign({ headers, agent: proxyAgent }, options || {})
  )

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${url}`)
  }

  return response.text()
}
