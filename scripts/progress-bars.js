const cliProgress = require('cli-progress')
const _defaultFormatBar = require('cli-progress/lib/format-bar')
const colors = require('colors')
const { argv } = require('yargs')

module.exports = class ProgressBars {
  constructor() {
    this.total = 0
    this.success = 0
    this.failed = 0

    this.multibar = new cliProgress.MultiBar({
      noTTYOutput: true,
      emptyOnZero: true,
      hideCursor: true,
      clearOnComplete: !argv.keep,
      format: (options, params, payload) => {
        const bar = _defaultFormatBar(params.progress, options)

        if (payload.type === 'total') {
          const percentage = this.total
            ? ((this.success + this.failed) / this.total) * 100
            : 0
          return colors.brightYellow(
            `Total [${bar}] ${percentage}% | ` +
              `${colors.green(this.success)}/${colors.red(this.failed)}/${
                this.total
              }`
          )
        }

        return `${payload.service} ${payload.ext} [${bar}] ${payload.status}`
      },
    })

    this.totalBar = this.multibar.create(this.total, 0, { type: 'total' })
    this.serviceBars = new Map()
  }

  addTotal(moreTotal) {
    this.total += moreTotal
    this.totalBar.setTotal(this.total)
  }

  create(service, ext) {
    const name = service + ext
    if (!this.serviceBars.has(name)) {
      this.serviceBars.set(
        name,
        this.multibar.create(100, 0, { service, ext, status: 'downloading' })
      )
    }
  }

  update(service, ext, status) {
    this[status] += 1
    this.totalBar.update(this.success + this.failed, { type: 'total' })

    const name = service + ext
    const serviceBar = this.serviceBars.get(name)
    if (serviceBar) {
      serviceBar.update(100, { service, ext, status })
      serviceBar.stop()
      this.serviceBars.delete(name)
    }
  }

  stop() {
    this.multibar.stop()
  }
}
