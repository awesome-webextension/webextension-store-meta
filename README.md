# webextension-store-meta
Get browser extension(webextension) item meta from Chrome Web Store and Firefox add-ons.

This lib uses many fallback methods to improve stability.

## Installation

npm

```bash
npm install webextension-store-meta
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
