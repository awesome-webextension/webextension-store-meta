const fs = require('fs-extra')
const path = require('path')
const htmlparser2 = require('htmlparser2')
const cheerio = require('cheerio')
const fixturesDir = path.join(__dirname, `../../.fixtures/chrome-web-store`)
const extIds = fs.readdirSync(fixturesDir)
const mockFixtures = new Map()

jest.mock('../fetch-text', () =>
  jest.fn(async (url) => {
    const idMatch = /\/([\d\w]+)(?:\?|$)/.exec(url)
    if (idMatch && mockFixtures.has(idMatch[1])) {
      return mockFixtures.get(idMatch[1])
    }
    throw new Error(`404 ${url}`)
  })
)

describe('Chrome Web Store', () => {
  beforeAll(async () => {
    await Promise.all(
      extIds.map(async (name) => {
        mockFixtures.set(
          name,
          await fs.readFile(path.join(fixturesDir, name), 'utf8')
        )
      })
    )
  })

  it('should extract itemprop', async () => {
    const fetchText = require('../fetch-text')

    const itemprop = {
      name: 'name',
      description: 'description',
      url: 'https://example.com/url',
      image: 'https://example.com/image.jpg',
      operatingSystem: 'Chrome',
      price: 404,
      priceCurrency: 'USD',
      version: '1.2.3',
      interactionCount: 'UserDownloads:200,000+',
    }

    fetchText.mockResolvedValueOnce(`
      <!DOCTYPE html>
      <html>
        <head>
          ${Object.keys(itemprop).map(
            (property) =>
              `<meta itemprop="${property}" content="${itemprop[property]}"/>`
          )}
        </head>
      </html>
    `)

    const ChromeWebStore = require('./index')
    const chromeWebStore = await ChromeWebStore.load({ id: 'xxx' })
    expect(chromeWebStore.meta()).toMatchObject({
      users: 200000,
      name: itemprop.name,
      description: itemprop.description,
      price: itemprop.price,
      priceCurrency: itemprop.priceCurrency,
      version: itemprop.version,
      url: itemprop.url,
      image: itemprop.image,
      operatingSystem: itemprop.operatingSystem,
      ratingValue: null,
      ratingCount: null,
    })
  })

  it('should extract og', async () => {
    const fetchText = require('../fetch-text')

    const og = {
      type: 'website',
      url: 'https://example.com/url',
      title: 'title',
      image: 'https://example.com/image.jpg',
      description: 'description',
    }

    fetchText.mockResolvedValueOnce(`
      <!DOCTYPE html>
      <html>
        <head>
          ${Object.keys(og).map(
            (property) =>
              `<meta property="og:${property}" content="${og[property]}"/>`
          )}
        </head>
      </html>
    `)

    const ChromeWebStore = require('./index')
    const chromeWebStore = await ChromeWebStore.load({ id: 'xxx' })
    expect(chromeWebStore.meta()).toMatchObject({
      name: og.title,
      description: og.description,
      url: og.url,
      image: og.image,
      users: null,
      ratingValue: null,
      ratingCount: null,
      price: null,
      priceCurrency: null,
      version: null,
      operatingSystem: null,
    })
  })

  const matchAnyInfo = {
    name: expect.any(String),
    description: expect.any(String),
    ratingValue: expect.any(Number),
    ratingCount: expect.any(Number),
    users: expect.any(Number),
    price: expect.any(Number),
    priceCurrency: expect.any(String),
    version: expect.any(String),
    url: expect.any(String),
    image: expect.any(String),
    operatingSystem: expect.any(String),
  }

  describe.each(extIds)(
    '%s',
    (extId) => {
      it('should return ext info', async () => {
        const ChromeWebStore = require('./index')
        const chromeWebStore = new ChromeWebStore({ id: extId })
        await chromeWebStore.load()
        expect(chromeWebStore.meta()).toMatchObject(matchAnyInfo)
      })

      it('should also return ext info with static `load` shortcut', async () => {
        const ChromeWebStore = require('./index')
        const chromeWebStore = await ChromeWebStore.load({ id: extId })
        expect(chromeWebStore.meta()).toMatchObject(matchAnyInfo)
      })

      it('should concat querystring', async () => {
        const ChromeWebStore = require('./index')
        const chromeWebStore = await ChromeWebStore.load({
          id: extId,
          qs: { hl: 'zh', lr: 'lang_zh-CN' },
        })
        expect(chromeWebStore.meta()).toMatchObject(matchAnyInfo)
        expect(require('../fetch-text')).toHaveBeenLastCalledWith(
          expect.stringContaining('?hl=zh&lr=lang_zh-CN'),
          undefined
        )
      })

      it('should throw error if document is not loaded', () => {
        const ChromeWebStore = require('./index')
        const chromeWebStore = new ChromeWebStore({ id: extId })
        expect(() => chromeWebStore.meta()).toThrow()
      })

      it('should extract from elements', async () => {
        const fetchText = require('../fetch-text')

        const $ = cheerio.load(htmlparser2.parseDOM(mockFixtures.get(extId)))
        $('[itemprop]').remove()
        $('[property]').remove()

        fetchText.mockResolvedValueOnce($.html())

        const ChromeWebStore = require('./index')
        const chromeWebStore = await ChromeWebStore.load({ id: extId })
        expect(chromeWebStore.meta()).toMatchObject({
          name: expect.any(String),
          description: expect.any(String),
          url: expect.any(String),
          version: expect.any(String),
          users: expect.any(Number),
          ratingValue: expect.any(Number),
          ratingCount: expect.any(Number),
          image: null,
          price: null,
          priceCurrency: null,
          operatingSystem: null,
        })
      })
    },
    20000
  )
})
