const querystring = require('querystring')
const htmlparser2 = require('htmlparser2')
const cheerio = require('cheerio')
const fetchText = require('../fetch-text')
const parseVersion = require('../parse-version')
const parseNum = require('../parse-num')
const err = require('../error')

/**
 * @typedef {Object} ChromeWebStoreOptions
 * @property {string} id - extension id
 * @property {object} [options] - node-fetch options {@link https://www.npmjs.com/package/node-fetch#options}
 * @property {Object.<string, string>|string} [qs] - querystring
 */

module.exports = class ChromeWebStore {
  /**
   * @param {ChromeWebStoreOptions} config
   */
  constructor(config) {
    this.config = config || {}
  }

  /**
   * @param {ChromeWebStoreOptions} config
   * @returns {Promise<ChromeWebStore>}
   */
  static async load(config) {
    const instance = new ChromeWebStore(config)
    await instance.load()
    return instance
  }

  /**
   * @returns {Promise<ChromeWebStore>}
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

    const url =
      'https://chrome.google.com/webstore/detail/' + this.config.id + qs
    const html = await fetchText(url, this.config.options)

    this._dom = htmlparser2.parseDOM(html)
    this._itemprop = {}
    this._og = {}

    htmlparser2.DomUtils.findAll((elem) => {
      if (elem.attribs.itemprop) {
        this._itemprop[elem.attribs.itemprop] = elem.attribs.content
      } else if (elem.attribs.property) {
        this._og[elem.attribs.property] = elem.attribs.content
      }
      return false
    }, this._dom)

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

    name = this.$('.e-f-w-Va > h1.e-f-w').text().trim()
    if (name) return name

    return null
  }

  /** @returns {string|null} */
  description() {
    let des = this.itemprop.description || this.og['og:description']
    if (des) return des

    des = this.$('meta[name="Description"]').attr('content')
    if (des) return des

    return null
  }

  /** @returns {number|null} */
  ratingValue() {
    let ratingValue = parseNum(this.itemprop.ratingValue)
    if (ratingValue >= 0 && ratingValue <= 5) return ratingValue

    ratingValue = parseNum(this.$('.rsw-stars').attr('title'))
    if (ratingValue >= 0 && ratingValue <= 5) return ratingValue

    ratingValue = parseNum(this.$('.bhAbjd').attr('aria-label'))
    if (ratingValue >= 0 && ratingValue <= 5) return ratingValue

    return null
  }

  /** @returns {number|null} */
  ratingCount() {
    let ratingCount = parseNum(this.itemprop.ratingCount)
    if (ratingCount >= 0) return ratingCount

    ratingCount = parseNum(this.$('.bhAbjd').text().trim())
    if (ratingCount >= 0) return ratingCount

    return null
  }

  /** @returns {number|null} */
  users() {
    let users = parseNum(this.itemprop.interactionCount)
    if (users >= 0) return users

    users = parseNum(this.$('.e-f-ih').attr('title'))
    if (users >= 0) return users

    return null
  }

  /** @returns {string|null} */
  price() {
    const price = parseNum(this.itemprop.price)
    return price >= 0 ? price : null
  }

  /** @returns {string|null} */
  priceCurrency() {
    return this.itemprop.priceCurrency || null
  }

  /** @returns {string|null} */
  version() {
    let version = this.itemprop.version
    if (version) return version

    version = parseVersion(this.$('.h-C-b-p-D-md').text().trim())
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
      this._$ = cheerio.load(this._dom)
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
