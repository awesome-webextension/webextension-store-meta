const fetch = require('node-fetch')
const UserAgent = require('user-agents')
const HttpsProxyAgent = require('https-proxy-agent')
const { argv } = require('yargs')

const proxyAgent =
  typeof argv.proxy === 'string' ? new HttpsProxyAgent(argv.proxy) : undefined

/**
 * @param {string} url
 * @param {object} options - node-fetch options {@link https://www.npmjs.com/package/node-fetch#options}
 */
module.exports = async function fetchText(url, options) {
  const response = await fetch(
    url,
    Object.assign(
      {
        'User-Agent': `${new UserAgent()}`,
        agent: proxyAgent,
      },
      options || {}
    )
  )

  return response.text()
}
