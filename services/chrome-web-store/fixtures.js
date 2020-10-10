const fetchText = require('../../lib/fetch-text')

module.exports = async function fixtures({ maxFixtures }) {
  const exts = new Map()
  const idMatcher = /\/webstore\/detail\/(?:[^/]+\/)?([\d\w]+)/g

  const html = await fetchText(
    'https://chrome.google.com/webstore/category/extensions'
  )

  for (
    let match;
    exts.size < maxFixtures && (match = idMatcher.exec(html)) !== null;

  ) {
    exts.set(match[1], {
      id: match[1],
      url: 'https://chrome.google.com/webstore/detail/' + match[1],
    })
  }

  return [...exts.values()]
}
