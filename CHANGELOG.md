## [1.0.4] - 2021-06-12
### Fixed
- Fix [#1](https://github.com/crimx/webextension-store-meta/issues/1) by adding domutils to dependencies.
  This is due to this [PR](https://github.com/badges/shields/pull/5697) in which I used undocumented way to import domutils API for performance reason. Domutils v2 does not seem to have this issue anymore as the code is more modular and cleaner.
