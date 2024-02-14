const querystring = require('querystring')
const { Parser } = require('htmlparser2/lib/Parser')
const { DomHandler } = require('domhandler')
const { findOne } = require('domutils')
const { getText, queryOne } = require('../dom')
const fetchText = require('../fetch-text')
const parseVersion = require('../parse-version')
const parseNum = require('../parse-num')

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

    this._itempropMemo = {}
    this._ogMemo = {}

    const handler = new DomHandler()
    new Parser(handler).end(html)
    this._dom = handler.dom

    return this
  }

  meta() {
    // fill cache all at once to reduce DOM traversal times.
    findOne((elem) => {
      const { itemprop, property, content } = elem.attribs
      if (itemprop) {
        this._itempropMemo[itemprop] = content
      } else if (property) {
        this._ogMemo[property] = content
      }
      return false
    }, this.dom)

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
    let name = this._itemprop('name') || this._og('og:title')
    if (name) return name

    name = getText(queryOne(this.dom, 'e-f-w', 'h1'))
    if (name) return name

    return null
  }

  /** @returns {string|null} */
  description() {
    let des = this._itemprop('description') || this._og('og:description')
    if (des) return des

    const desElem = findOne(
      (elem) => elem.name === 'meta' && elem.attribs.name === 'Description',
      this.dom,
    )
    if (desElem) {
      des = desElem.attribs.content
      if (des) return des
    }

    return null
  }

  /** @returns {number|null} */
  ratingValue() {
    let ratingValue = parseNum(this._itemprop('ratingValue'))
    if (ratingValue >= 0 && ratingValue <= 5) return ratingValue

    const rswStarsTester = /(?:^|\s)rsw-stars(?:\s|$)/
    const fallbackTester = /(?:^|\s)bhAbjd(?:\s|$)/
    let fallbackElem

    const ratingValueElem = findOne((elem) => {
      if (elem.attribs.class) {
        if (rswStarsTester.test(elem.attribs.class)) {
          return true
        }
        if (!fallbackElem && fallbackTester.test(elem.attribs.class)) {
          fallbackElem = elem
        }
      }
      return false
    }, this.dom)

    if (ratingValueElem) {
      ratingValue = parseNum(ratingValueElem.attribs.title)
      if (ratingValue >= 0 && ratingValue <= 5) return ratingValue
    }

    if (fallbackElem) {
      ratingValue = parseNum(fallbackElem.attribs['aria-label'])
      if (ratingValue >= 0 && ratingValue <= 5) return ratingValue
    }

    return null
  }

  /** @returns {number|null} */
  ratingCount() {
    let ratingCount = parseNum(this._itemprop('ratingCount'))
    if (ratingCount >= 0) return ratingCount

    ratingCount = parseNum(getText(queryOne(this.dom, 'bhAbjd')))
    if (ratingCount >= 0) return ratingCount

    return null
  }

  /** @returns {number|null} */
  users() {
    let users = parseNum(this._itemprop('interactionCount'))
    if (users >= 0) return users

    const usersElem = queryOne(this.dom, 'e-f-ih')
    if (usersElem) {
      users = parseNum(usersElem.attribs.title)
      if (users >= 0) return users
    }

    return null
  }

  /** @returns {string|null} */
  price() {
    const price = parseNum(this._itemprop('price'))
    return price >= 0 ? price : null
  }

  /** @returns {string|null} */
  priceCurrency() {
    return this._itemprop('priceCurrency') || null
  }

  /** @returns {string|null} */
  version() {
    let version = this._itemprop('version')
    if (version) return version

    version = parseVersion(getText(queryOne(this.dom, 'h-C-b-p-D-md')))
    if (version) return version

    return null
  }

  /** @returns {string|null} */
  url() {
    let url = this._itemprop('url') || this._og('og:url')
    if (url) return url

    const urlElem = findOne(
      (elem) => elem.name === 'link' && elem.attribs.rel === 'canonical',
      this.dom,
    )
    if (urlElem) {
      url = urlElem.attribs.href
      if (url) return url
    }

    return null
  }

  /** @returns {string|null} */
  image() {
    return this._itemprop('image') || this._og('og:image') || null
  }

  /** @returns {string|null} */
  operatingSystem() {
    return this._itemprop('operatingSystem') || null
  }

  get dom() {
    if (!this._dom) {
      throw new Error(
        'Item not loaded. Please run `await instance.load()` first.`',
      )
    }
    return this._dom
  }

  /**
   * @param {string} property
   * @returns {string|null}
   */
  _itemprop(property) {
    if (this._itempropMemo[property] === void 0) {
      const itempropElem = findOne(
        (elem) => elem.attribs.itemprop === property,
        this.dom,
      )

      this._itempropMemo[property] =
        itempropElem && itempropElem.attribs.content != null
          ? itempropElem.attribs.content
          : null
    }

    return this._itempropMemo[property]
  }

  /**
   * @param {string} property
   * @returns {string|null}
   */
  _og(property) {
    if (this._ogMemo[property] === void 0) {
      const ogElem = findOne(
        (elem) => elem.attribs.property === property,
        this.dom,
      )

      this._ogMemo[property] =
        ogElem && ogElem.attribs.content != null ? ogElem.attribs.content : null
    }

    return this._ogMemo[property]
  }
}
