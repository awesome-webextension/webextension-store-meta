const querystring = require('querystring')
const { Parser } = require('htmlparser2/lib/Parser')
const { DomHandler, isText } = require('domhandler')
const { getText, queryOne, findOne } = require('../dom')
const fetchText = require('../fetch-text')
const parseVersion = require('../parse-version')

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
  constructor({ id, options, qs } = {}) {
    this.id = id
    this.options = options

    if (typeof qs === 'string') {
      qs = querystring.parse(qs.replace(/^\?/, ''))
    } else if (!qs) {
      qs = {}
    }
    this.qs = querystring.stringify(qs)
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
    const url =
      'https://chromewebstore.google.com/detail/' + this.id + '?' + this.qs
    const html = await fetchText(url, this.options)

    const handler = new DomHandler()
    new Parser(handler).end(html)
    this._dom = handler.dom

    return this
  }

  meta() {
    return {
      name: this.name(),
      description: this.description(),
      url: this.url(),
      image: this.image(),
      ratingValue: this.ratingValue(),
      ratingCount: this.ratingCount(),
      users: this.users(),
      version: this.version(),
    }
  }

  /** @returns {string|null} */
  name() {
    return this._og('og:title')
  }

  /** @returns {string|null} */
  description() {
    return this._og('og:description')
  }

  /** @returns {string|null} */
  url() {
    let url = this._og('og:url')
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
    return this._og('og:image')
  }

  /** @returns {string|null} */
  ratingValue() {
    return this._parseRating('ratingValue')
  }

  /** @returns {string|null} */
  ratingCount() {
    return this._parseRating('ratingCount')
  }

  /** @returns {string|null} */
  users() {
    if (this._usersCache !== void 0) {
      return this._usersCache
    }

    const container = queryOne(this.dom, 'F9iKBc')
    if (container) {
      for (let i = 0; i < container.children.length; i++) {
        const node = container.children[i]
        if (isText(node)) {
          const content = getText(node)
          if (/^[\d,.]+(\s+users)?$/.test(content)) {
            return (this._usersCache = content.replace(/\s+users$/, ''))
          }
        }
      }
    }

    return (this._usersCache = null)
  }

  /** @returns {string|null} */
  version() {
    if (this._versionCache !== void 0) {
      return this._versionCache
    }

    const versionEl = queryOne(this.dom, 'pDlpAd')
    if (versionEl) {
      return (this._versionCache = parseVersion(getText(versionEl)))
    }

    return (this._versionCache = null)
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
  _og(property) {
    if (!this._ogMemo) {
      this._ogMemo = {}
    }
    if (this._ogMemo[property] === void 0) {
      findOne((elem) => {
        if (elem.attribs.property == null) return false
        this._ogMemo[elem.attribs.property] = elem.attribs.content
        return elem.attribs.property === property
      }, this.dom)
    }

    return this._ogMemo[property] == null ? null : this._ogMemo[property]
  }

  /**
   * @param {"ratingValue"|"ratingCount"} key
   * @returns {string|null}
   */
  _parseRating(key) {
    if (this._ratingCache === void 0) {
      this._ratingCache = parseRating(this.dom)
    }

    return this._ratingCache && this._ratingCache[key]
  }
}

/**
 *
 * @param {Node[]} dom
 * @param {string} id
 * @return {{ ratingValue: string|null, ratingCount: string|null } | null}
 */
function parseRating(dom) {
  const container = queryOne(dom, 'j3zrsd')
  if (container) {
    const result = { ratingValue: null, ratingCount: null }

    const ratingValueEl = queryOne(container, 'Vq0ZA')
    if (ratingValueEl) {
      const ratingValue = getText(ratingValueEl)
      if (/^\d+\.?\d*$/.test(ratingValue)) {
        result.ratingValue = ratingValue
      }
    }

    const ratingCountEl = queryOne(container, 'xJEoWe')
    if (ratingCountEl) {
      result.ratingCount = getText(ratingCountEl).replace(/\s*ratings$/, '')
    }

    if (result.ratingValue !== null || result.ratingCount !== null) {
      return result
    }
  }
  return null
}
