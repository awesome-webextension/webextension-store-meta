module.exports.notLoaded = function errNotLoaded() {
  throw new Error('Item not loaded. Please run `await instance.load()` first.`')
}
