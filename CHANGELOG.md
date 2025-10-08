## [1.2.9] - 2025-10-08

### Fixed
- Add null check for extension not found in ChromeWebStore.

## [1.2.8] - 2025-07-25

### Fixed

- Support new AMO store info.

## [1.2.7] - 2025-07-11

### Reverted
- Support Node 18 (badgen)

## [1.2.6] - 2025-07-11

### Fixed
- Update Chrome manifest version parsing.

## [1.2.5] - 2025-07-10

### Fixed

- Update Chrome version parsing to handle new manifest format. [#9](https://github.com/awesome-webextension/webextension-store-meta/issues/9).

## [1.2.4] - 2024-10-13

### Added
- Add `size` and `lastUpdated` [#8](https://github.com/awesome-webextension/webextension-store-meta/issues/8).

## [1.2.3] - 2024-05-17

### Updated
- Add a backup method to parse Chrome version from manifest.


## [1.2.2] - 2024-05-17

### Fixed
- Update chrome version parsing


## [1.2.1] - 2024-04-18

### Updated
- Loosen `engines.node` constraint #5


## [1.2.0] - 2024-04-10

### Updated
- **Breaking:** Implement with TypeScript. `module.exports` is no longer available. Use named import instead.

### Fixed
- Fix #2 UTF-8 `location` header causing infinite redirect loop.


## [1.1.0] - 2023-02-16

### Updated
- Update to the new Chrome Web Store. Removed `operatingSystem`, `price` and `priceCurrency`.


## [1.0.5] - 2021-11-08

### Updated
- Replace Travis-CI with Github Actions.


## [1.0.4] - 2021-06-12

### Fixed
- Fix [#1](https://github.com/crimx/webextension-store-meta/issues/1) by adding domutils to dependencies.
  This is due to this [PR](https://github.com/badges/shields/pull/5697) in which I used undocumented way to import domutils API for performance reason. Domutils v2 does not seem to have this issue anymore as the code is more modular and cleaner.
