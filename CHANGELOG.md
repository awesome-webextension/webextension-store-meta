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
