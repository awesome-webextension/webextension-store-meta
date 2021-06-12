const querystring = require('querystring')
const { Parser } = require('htmlparser2/lib/Parser')
const { DomHandler } = require('domhandler')
const { findOne } = require('domutils')
const { getText, queryOne } = require('../dom')
const fetchText = require('../fetch-text')
const parseNum = require('../parse-num')
const parseVersion = require('../parse-version')

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

    this._itempropMemo = {}
    this._ogMemo = {}

    const handler = new DomHandler()
    new Parser(handler).end(html)
    this._dom = handler.dom

    const schema = findOne(
      (elem) =>
        elem.name === 'script' && elem.attribs.type === 'application/ld+json',
      this._dom
    )

    if (schema) {
      try {
        this._itempropMemo = JSON.parse(schema.children[0].data)

        if (this._itempropMemo.aggregateRating) {
          const {
            ratingValue,
            ratingCount,
          } = this._itempropMemo.aggregateRating
          if (this._itempropMemo.ratingValue == null) {
            this._itempropMemo.ratingValue =
              ratingValue == null ? null : ratingValue
          }
          if (this._itempropMemo.ratingCount == null) {
            this._itempropMemo.ratingCount =
              ratingCount == null ? null : ratingCount
          }
        }

        if (this._itempropMemo.offers) {
          const { price, priceCurrency } = this._itempropMemo.offers
          if (this._itempropMemo.price == null) {
            this._itempropMemo.price = price == null ? null : price
          }
          if (this._itempropMemo.priceCurrency == null) {
            this._itempropMemo.priceCurrency =
              priceCurrency == null ? null : priceCurrency
          }
        }
      } catch (e) {
        // ignore corrupted schema
      }
    }

    return this
  }

  meta() {
    // fill cache all at once to reduce DOM traversal times.
    findOne((elem) => {
      const { itemprop, property, content } = elem.attribs
      if (itemprop && this._itempropMemo[itemprop] == null) {
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

    const title = queryOne(this.dom, 'AddonTitle')
    if (title) {
      name = getText(title)
        .replace(getText(queryOne(title, 'AddonTitle-author')), '')
        .trim()
      if (name) return name
    }

    return null
  }

  /** @returns {string|null} */
  description() {
    let des = this._itemprop('description')
    if (des) return des

    des = getText(queryOne(this.dom, 'Addon-summary'))
    if (des) return des

    // og and meta have extra prefix

    des = this._og('og:description')
    if (des) return des

    const desElem = findOne(
      (elem) => elem.name === 'meta' && elem.attribs.name === 'Description',
      this.dom
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

    ratingValue = parseNum(
      getText(queryOne(this.dom, 'AddonMeta-rating-title'))
    )
    if (ratingValue >= 0 && ratingValue <= 5) return ratingValue

    return null
  }

  /** @returns {number|null} */
  ratingCount() {
    let ratingCount = parseNum(this._itemprop('ratingCount'))
    if (ratingCount >= 0) return ratingCount

    ratingCount = parseNum(
      getText(queryOne(this.dom, 'AddonMeta-reviews-content-link'))
    )
    if (ratingCount >= 0) return ratingCount

    return null
  }

  /** @returns {number|null} */
  users() {
    const users = parseNum(getText(queryOne(this.dom, 'MetadataCard-content')))
    if (users >= 0) return users

    return null
  }

  /** @returns {string|null} */
  price() {
    const price = this._itemprop('price')
    if (price != null) return price

    return null
  }

  /** @returns {string|null} */
  priceCurrency() {
    const priceCurrency = this._itemprop('priceCurrency')
    if (priceCurrency != null) return priceCurrency

    return null
  }

  /** @returns {string|null} */
  version() {
    let version = this._itemprop('version')
    if (version) return version

    version = parseVersion(getText(queryOne(this.dom, 'AddonMoreInfo-version')))
    if (version) return version

    return null
  }

  /** @returns {string|null} */
  url() {
    let url = this._itemprop('url') || this._og('og:url')
    if (url) return url

    const urlElem = findOne(
      (elem) => elem.name === 'link' && elem.attribs.rel === 'canonical',
      this.dom
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
        'Item not loaded. Please run `await instance.load()` first.`'
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
        this.dom
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
        this.dom
      )

      this._ogMemo[property] =
        ogElem && ogElem.attribs.content != null ? ogElem.attribs.content : null
    }

    return this._ogMemo[property]
  }
}
