const fetchText = require('../fetch-text')

module.exports = async function fixtures({ maxFixtures, proxyAgent }) {
  const exts = new Map()
  const idMatcher = /\/detail\/(?:[^/]+\/)?([\d\w]+)/g

  const html = await fetchText('https://chromewebstore.google.com/', {
    agent: proxyAgent,
  })

  for (
    let match;
    exts.size < maxFixtures && (match = idMatcher.exec(html)) !== null;

  ) {
    exts.set(match[1], {
      id: match[1],
      url: 'https://chromewebstore.google.com/detail/' + match[1],
    })
  }

  if (exts.size <= 0) {
    throw new Error('No extensions found')
  }

  return [...exts.values()]
}
