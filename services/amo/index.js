const querystring = require('querystring')
const { JSDOM } = require('jsdom')
const get = require('lodash/get')
const fetchText = require('../../lib/fetch-text')
const parseNum = require('../../lib/parse-num')

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

    this._document = new JSDOM(html).window.document
    this._schema = undefined

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
    let name = this._extractSchema('name') || this._extractOg('og:title')
    if (name) return name

    const contentTitle = this.document.querySelector('.AddonTitle')
    if (contentTitle) {
      const contentAuthor = contentTitle.querySelector('.AddonTitle-author')
      if (contentAuthor) {
        contentAuthor.remove()
        contentTitle.parentElement.appendChild(contentAuthor)
      }
      name = (contentTitle.textContent || '').trim()
      if (name) return name
    }

    return null
  }

  /** @returns {string|null} */
  description() {
    let des = this._extractSchema('description')
    if (des) return des

    const contentDes = this.document.querySelector('.Addon-summary')
    if (contentDes) {
      des = (contentDes.textContent || '').trim()
      if (des) return des
    }

    // og and meta have extra prefix

    des = this._extractOg('og:description')
    if (des) return des

    const meta = this.document.querySelector('meta[name="Description"]')
    if (meta) {
      des = meta.getAttribute('content')
      if (des) return des
    }

    return null
  }

  /** @returns {number|null} */
  ratingValue() {
    let ratingValue = this._extractSchema('aggregateRating', 'ratingValue')
    if (ratingValue >= 0 && ratingValue <= 5) return ratingValue

    const contentRating = this.document.querySelector('.AddonMeta-rating-title')
    if (contentRating) {
      ratingValue = parseNum(contentRating.textContent)
      if (ratingValue >= 0 && ratingValue <= 5) return ratingValue
    }

    return null
  }

  /** @returns {number|null} */
  ratingCount() {
    let ratingCount = this._extractSchema('aggregateRating', 'ratingCount')
    if (ratingCount >= 0) return ratingCount

    const contentRatingCount = this.document.querySelector(
      '.AddonMeta-reviews-content-link'
    )
    if (contentRatingCount) {
      ratingCount = parseNum(contentRatingCount.textContent)
      if (ratingCount >= 0) return ratingCount
    }

    return null
  }

  /** @returns {number|null} */
  users() {
    let contentUsers = this.document.querySelector('.MetadataCard-content')
    if (contentUsers) {
      const users = parseNum(contentUsers.textContent)
      if (users >= 0) return users
    }

    return null
  }

  /** @returns {string|null} */
  price() {
    return this._extractSchema('offers', 'price')
  }

  /** @returns {string|null} */
  priceCurrency() {
    return this._extractSchema('offers', 'priceCurrency')
  }

  /** @returns {string|null} */
  version() {
    let version = this._extractSchema('version')
    if (version) return version

    const contentVersion = this.document.querySelector('.AddonMoreInfo-version')
    if (contentVersion) {
      version = (contentVersion.textContent || '').trim()
      if (/^\d+(?:\.\d+)+$/.test(version)) {
        return version
      }
    }

    return null
  }

  /** @returns {string|null} */
  url() {
    let url = this._extractSchema('url') || this._extractOg('og:url')
    if (url) return url

    const link = this.document.querySelector('link[rel="canonical"]')
    if (link) {
      url = link.getAttribute('href')
      if (url) return url
    }

    return null
  }

  /** @returns {string|null} */
  image() {
    return this._extractSchema('image') || this._extractOg('og:image')
  }

  /** @returns {string|null} */
  operatingSystem() {
    return this._extractSchema('operatingSystem')
  }

  get document() {
    if (!this._document) {
      throw new Error(
        'Item not loaded. Please run `await instance.load()` first.`'
      )
    }
    return this._document
  }

  _extractSchema(...path) {
    if (this._schema === undefined) {
      const schema = this.document.querySelector(
        'script[type="application/ld+json"'
      )
      try {
        this._schema = JSON.parse(schema.textContent)
      } catch (e) {
        this._schema = null
      }
    }

    return this._schema ? get(this._schema, path, null) : null
  }

  _extractOg(property) {
    const ogTitle = this.document.querySelector(`[property="${property}"]`)
    if (ogTitle) {
      const name = ogTitle.getAttribute('content')
      if (name) return name
    }
    return null
  }
}
