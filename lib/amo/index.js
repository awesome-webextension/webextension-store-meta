const querystring = require('querystring')
const htmlparser2 = require('htmlparser2')
const cheerio = require('cheerio')
const fetchText = require('../fetch-text')
const parseNum = require('../parse-num')
const parseVersion = require('../parse-version')
const err = require('../error')

/**
 * @typedef {Object} AmoOptions
 * @property {string} id - extension id
 * @property {string} [locale] - https://addons.mozilla.org/[locale]/firefox/addon/[id]
 * @property {object} [options] - node-fetch options {@link https://www.npmjs.com/package/node-fetch#options}
 * @property {Object.<string, string>|string} [qs] - querystring
 */

module.exports = class Amo {
  /**
   * @param {AmoOptions} config
   */
  constructor(config) {
    this.config = config || {}
  }

  /**
   * @param {AmoOptions} config
   * @returns {Promise<Amo>}
   */
  static async load(config) {
    const instance = new Amo(config)
    await instance.load()
    return instance
  }

  /**
   * @returns {Promise<Amo>}
   */
  async load() {
    let qs = this.config.qs
      ? typeof this.config.qs === 'string'
        ? this.config.qs
        : querystring.stringify(this.config.qs)
      : ''
    if (qs && !qs.startsWith('?')) {
      qs = '?' + qs
    }

    const locale = this.config.locale ? this.config.locale + '/' : ''

    const url =
      `https://addons.mozilla.org/${locale}firefox/addon/` + this.config.id + qs
    const html = await fetchText(url, this.config.options)

    this._dom = htmlparser2.parseDOM(html)
    this._itemprop = {}
    this._og = {}

    let schema

    htmlparser2.DomUtils.findAll((elem) => {
      if (elem.attribs.itemprop) {
        this._itemprop[elem.attribs.itemprop] = elem.attribs.content
      } else if (elem.attribs.property) {
        this._og[elem.attribs.property] = elem.attribs.content
      }

      if (
        elem.name === 'script' &&
        elem.attribs.type === 'application/ld+json'
      ) {
        schema = elem
      }

      return false
    }, this._dom)

    if (schema) {
      try {
        this._itemprop = JSON.parse(schema.children[0].data)
      } catch (e) {
        // ignore
      }
    }

    return this
  }

  meta() {
    return {
      name: this.name(),
      description: this.description(),
      ratingValue: this.ratingValue(),
      ratingCount: this.ratingCount(),
      users: this.users(),
      price: this.price(),
      priceCurrency: this.priceCurrency(),
      version: this.version(),
      url: this.url(),
      image: this.image(),
      operatingSystem: this.operatingSystem(),
    }
  }

  /** @returns {string|null} */
  name() {
    let name = this.itemprop.name || this.og['og:title']
    if (name) return name

    name = this.$('.AddonTitle')
      .text()
      .replace(this.$('.AddonTitle .AddonTitle-author').text(), '')
      .trim()
    if (name) return name

    return null
  }

  /** @returns {string|null} */
  description() {
    let des = this.itemprop.description
    if (des) return des

    des = this.$('.Addon-summary').text().trim()
    if (des) return des

    // og and meta have extra prefix

    des = this.og['og:description']
    if (des) return des

    des = this.$('meta[name="Description"]').attr('content')
    if (des) return des

    return null
  }

  /** @returns {number|null} */
  ratingValue() {
    const { aggregateRating } = this.itemprop
    let ratingValue = aggregateRating && aggregateRating.ratingValue
    if (ratingValue != null && ratingValue >= 0 && ratingValue <= 5)
      return ratingValue

    ratingValue = parseNum(this.$('.AddonMeta-rating-title').text())
    if (ratingValue >= 0 && ratingValue <= 5) return ratingValue

    return null
  }

  /** @returns {number|null} */
  ratingCount() {
    const { aggregateRating } = this.itemprop
    let ratingCount = aggregateRating && aggregateRating.ratingCount
    if (ratingCount != null && ratingCount >= 0) return ratingCount

    ratingCount = parseNum(this.$('.AddonMeta-reviews-content-link').text())

    return null
  }

  /** @returns {number|null} */
  users() {
    const users = parseNum(this.$('.MetadataCard-content').text())
    if (users >= 0) return users

    return null
  }

  /** @returns {string|null} */
  price() {
    const { offers } = this.itemprop
    const price = offers && offers.price
    if (price != null) return price

    return null
  }

  /** @returns {string|null} */
  priceCurrency() {
    const { offers } = this.itemprop
    return (offers && offers.priceCurrency) || null
  }

  /** @returns {string|null} */
  version() {
    let version = this.itemprop.version
    if (version) return version

    version = parseVersion(this.$('.AddonMoreInfo-version').text())
    if (version) return version

    return null
  }

  /** @returns {string|null} */
  url() {
    let url = this.itemprop.url || this.og['og:url']
    if (url) return url

    url = this.$('link[rel="canonical"]').attr('href')
    if (url) return url

    return null
  }

  /** @returns {string|null} */
  image() {
    return this.itemprop.image || this.og['og:image'] || null
  }

  /** @returns {string|null} */
  operatingSystem() {
    return this.itemprop.operatingSystem || null
  }

  get dom() {
    return this._dom || err.notLoaded()
  }

  get $() {
    if (!this._$) {
      this._$ = this._$ = cheerio.load(this._dom)
    }
    return this._$
  }

  get itemprop() {
    return this._itemprop || err.notLoaded()
  }

  get og() {
    return this._og || err.notLoaded()
  }
}
