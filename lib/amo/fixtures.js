const fetchText = require('../fetch-text')

module.exports = async function fixtures({ maxFixtures }) {
  const exts = new Map()
  const idMatcher = /\/firefox\/addon\/([^/?]+)/g

  const html = await fetchText('https://addons.mozilla.org/firefox/extensions/')

  for (
    let match;
    exts.size < maxFixtures && (match = idMatcher.exec(html)) !== null;

  ) {
    exts.set(match[1], {
      id: match[1],
      url: 'https://addons.mozilla.org/firefox/addon/' + match[1],
    })
  }

  return [...exts.values()]
}
