const fs = require('fs-extra')
const path = require('path')

const fixturesDir = path.join(__dirname, `../../.fixtures/amo`)
const extIds = fs.readdirSync(fixturesDir)
const mockFixtures = new Map()

jest.mock('../../lib/fetch-text', () =>
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
        mockFixtures.set(name, await fs.readFile(path.join(fixturesDir, name)))
      })
    )
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
        expect(require('../../lib/fetch-text')).toHaveBeenLastCalledWith(
          expect.stringContaining('?hl=zh&lr=lang_zh-CN'),
          undefined
        )
      })

      it('should throw error if document is not loaded', () => {
        const Amo = require('./index')
        const amo = new Amo({ id: extId })
        expect(() => amo.meta()).toThrow()
      })
    },
    20000
  )
})
