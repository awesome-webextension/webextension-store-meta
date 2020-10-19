<div align="center">
<p><img height="150" src="./logo.svg" alt="webextension-store-meta logo"></p>

# webextension-store-meta

[![npm-version](https://img.shields.io/npm/v/webextension-store-meta.svg)](https://www.npmjs.com/package/webextension-store-meta)
[![Build Status](https://img.shields.io/travis/com/crimx/webextension-store-meta/master)](https://travis-ci.com/crimx/webextension-store-meta)
[![Coverage Status](https://img.shields.io/coveralls/github/crimx/webextension-store-meta/master)](https://coveralls.io/github/crimx/webextension-store-meta?branch=master)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

</div>



Get browser extension(webextension) item meta from Chrome Web Store and Firefox add-ons.

This lib uses many fallback methods to improve stability and performance.

## Who Use It

<table>
  <tbody>
    <tr>
      <td align="center">
        <img width="198" height="58" src="https://raw.githubusercontent.com/badges/shields/master/frontend/images/logo.svg?sanitize=true">
    </td>
      <td align="center">
        <img width="80" height="80" src="https://badgen.net/static/badgen-logo.svg">
      </td>
    </tr>
    <tr>
      <th align="center">
        <a href="https://shields.io/">Shields.io</a>
      </th>
      <th align="center">
        <a href="https://badgen.net/chrome-web-store">Badgen</a>
      </th>
    </tr>
    <tr>
      <td align="center">
        Quality metadata badges <br>for open source projects
      </td>
      <td align="center">
        Fast badge generating service
      </td>
    </tr>
  <tbody>
</table>

## Installation

npm

```bash
npm add webextension-store-meta
```

yarn

```bash
yarn add webextension-store-meta
```

## Usage

All stores share the same api.

```js
const ChromeWebStore = require('webextension-store-meta/lib/chrome-web-store')
const chromeWebStore = await ChromeWebStore.load({ id: 'xxxxxxx', qs: { hl: 'en' } })
console.log(chromeWebStore.meta())

const Amo = require('webextension-store-meta/lib/amo')
const amo = await Amo.load({ id: 'xxxxxxx' })
console.log(amo.meta())

result = {
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
```

Get individual property:

```js
const Amo = require('webextension-store-meta/lib/amo')
const amo = await Amo.load({ id: 'xxxxxxx' })
console.log(amo.name())
console.log(amo.ratingValue())
```

Load config:

- **id** `{string}` *required* - extension id.
- **qs** `{string|object}` *optional* - querystring.
- **options** `object` *optional* - [node-fetch options](https://www.npmjs.com/package/node-fetch#options).

## Development

```bash
git clone git@github.com:crimx/webextension-store-meta.git
cd webextension-store-meta
yarn install

# {--max 5} - max 5 fixtures for each service
# {--proxy http://xxx:xxx} - http proxy
# {--force} - always download fixtures, otherwise skip if fixtures dir not empty
# {--keep} - keep progress result
yarn fixtures --keep

yarn test --watch
```
