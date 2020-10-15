const fs = require('fs-extra')
const path = require('path')
const htmlparser2 = require('htmlparser2')
const cheerio = require('cheerio')
const fixturesDir = path.join(__dirname, `../../.fixtures/amo`)
const extIds = fs.readdirSync(fixturesDir)
const mockFixtures = new Map()

jest.mock('../fetch-text', () =>
  jest.fn(async (url) => {
    const idMatch = /\/firefox\/addon\/([^/?]+)/.exec(url)
    if (idMatch && mockFixtures.has(idMatch[1])) {
      return mockFixtures.get(idMatch[1])
    }
    throw new Error(`404 ${url}`)
  })
)

describe('Amo', () => {
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

  it('should extract itemprop schema', async () => {
    const fetchText = require('../fetch-text')

    const schema = {
      '@context': 'http://schema.org',
      '@type': 'WebApplication',
      applicationCategory: 'http://schema.org/OtherApplication',
      name: 'name',
      description: 'description',
      url: 'https://example.com/url',
      image: 'https://example.com/image.jpg',
      operatingSystem: 'Firefox',
      offers: {
        '@type': 'Offer',
        availability: 'http://schema.org/InStock',
        price: 404,
        priceCurrency: 'USD',
      },
      version: '1.2.3',
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingCount: 202,
        ratingValue: 3.8,
      },
    }

    fetchText.mockResolvedValueOnce(`
      <!DOCTYPE html>
      <html>
        <head>
          <script data-react-helmet="true" type="application/ld+json">
          ${JSON.stringify(schema)}
          </script>
        </head>
      </html>
    `)

    const Amo = require('./index')
    const amo = await Amo.load({ id: 'xxx' })
    expect(amo.meta()).toMatchObject({
      users: null,
      name: schema.name,
      description: schema.description,
      ratingValue: schema.aggregateRating.ratingValue,
      ratingCount: schema.aggregateRating.ratingCount,
      price: schema.offers.price,
      priceCurrency: schema.offers.priceCurrency,
      version: schema.version,
      url: schema.url,
      image: schema.image,
      operatingSystem: schema.operatingSystem,
    })
  })

  it('should extract og', async () => {
    const fetchText = require('../fetch-text')

    const og = {
      type: 'website',
      url: 'https://example.com/url',
      title: 'title',
      locale: 'en-US',
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

    const Amo = require('./index')
    const amo = await Amo.load({ id: 'xxx' })
    expect(amo.meta()).toMatchObject({
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
        const Amo = require('./index')
        const amo = new Amo({ id: extId })
        await amo.load()
        expect(amo.meta()).toMatchObject(matchAnyInfo)
      })

      it('should also return ext info with static `load` shortcut', async () => {
        const Amo = require('./index')
        const amo = await Amo.load({ id: extId })
        expect(amo.meta()).toMatchObject(matchAnyInfo)
      })

      it('should concat querystring', async () => {
        const Amo = require('./index')
        const amo = await Amo.load({
          id: extId,
          qs: { hl: 'zh', lr: 'lang_zh-CN' },
        })
        expect(amo.meta()).toMatchObject(matchAnyInfo)
        expect(require('../fetch-text')).toHaveBeenLastCalledWith(
          expect.stringContaining('?hl=zh&lr=lang_zh-CN'),
          undefined
        )
      })

      it('should throw error if document is not loaded', () => {
        const Amo = require('./index')
        const amo = new Amo({ id: extId })
        expect(() => amo.meta()).toThrow()
      })

      it('should extract from elements', async () => {
        const fetchText = require('../fetch-text')

        const $ = cheerio.load(htmlparser2.parseDOM(mockFixtures.get(extId)))
        $('[itemprop]').remove()
        $('[property]').remove()
        $('script[type="application/ld+json"]').remove()

        fetchText.mockResolvedValueOnce($.html())

        const Amo = require('./index')
        const amo = await Amo.load({ id: 'xxx' })
        expect(amo.meta()).toMatchObject({
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
