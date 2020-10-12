const querystring = require('querystring')
const { JSDOM } = require('jsdom')
const fetchText = require('../../lib/fetch-text')
const parseVersion = require('../../lib/parse-version')
const parseNum = require('../../lib/parse-num')

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

    this._document = new JSDOM(html).window.document

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
    let name = this._extractItemprop('name') || this._extractOg('og:title')
    if (name) return name

    const contentTitle = this.document.querySelector('.e-f-w-Va > h1.e-f-w')
    if (contentTitle) {
      name = (contentTitle.textContent || '').trim()
      if (name) return name
    }

    return null
  }

  /** @returns {string|null} */
  description() {
    let des =
      this._extractItemprop('description') || this._extractOg('og:description')
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
    let ratingValue = parseNum(this._extractItemprop('ratingValue'))
    if (ratingValue >= 0 && ratingValue <= 5) return ratingValue

    const rswStars = this.document.querySelector('.rsw-stars')
    if (rswStars) {
      ratingValue = parseNum(rswStars.getAttribute('title'))
      if (ratingValue >= 0 && ratingValue <= 5) return ratingValue
    }

    const bhAbjd = this.document.querySelector('.bhAbjd')
    if (bhAbjd) {
      ratingValue = parseNum(bhAbjd.getAttribute('aria-label'))
      if (ratingValue >= 0 && ratingValue <= 5) return ratingValue
    }

    return null
  }

  /** @returns {number|null} */
  ratingCount() {
    let ratingCount = parseNum(this._extractItemprop('ratingCount'))
    if (ratingCount >= 0) return ratingCount

    const bhAbjd = this.document.querySelector('.bhAbjd')
    if (bhAbjd) {
      ratingCount = parseNum(bhAbjd.textContent)
      if (ratingCount >= 0) return ratingCount
    }

    return null
  }

  /** @returns {number|null} */
  users() {
    let users = parseNum(this._extractItemprop('interactionCount'))
    if (users >= 0) return users

    const contentUsers = this.document.querySelector('.e-f-ih')
    if (contentUsers) {
      users = parseNum(contentUsers.getAttribute('title'))
      if (users >= 0) return users
    }

    return null
  }

  /** @returns {string|null} */
  price() {
    const price = parseNum(this._extractItemprop('price'))
    return price >= 0 ? price : null
  }

  /** @returns {string|null} */
  priceCurrency() {
    return this._extractItemprop('priceCurrency')
  }

  /** @returns {string|null} */
  version() {
    let version = this._extractItemprop('version')
    if (version) return version

    const contentVersion = this.document.querySelector('.h-C-b-p-D-md')
    if (contentVersion) {
      version = parseVersion(contentVersion.textContent)
      if (version) return version
    }

    return null
  }

  /** @returns {string|null} */
  url() {
    let url = this._extractItemprop('url') || this._extractOg('og:url')
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
    return this._extractItemprop('image') || this._extractOg('og:image')
  }

  get document() {
    if (!this._document) {
      throw new Error(
        'Item not loaded. Please run `await instance.load()` first.`'
      )
    }
    return this._document
  }

  /** @returns {string|null} */
  operatingSystem() {
    return this._extractItemprop('operatingSystem')
  }

  _extractItemprop(itemprop) {
    const $itemprop = this.document.querySelector(`[itemprop="${itemprop}"]`)
    if ($itemprop) {
      const name = $itemprop.getAttribute('content')
      if (name) return name
    }
    return null
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
