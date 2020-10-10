const fs = require('fs-extra')
const path = require('path')
const fetchText = require('../lib/fetch-text')
const ProgressBars = require('./progress-bars')
const { argv } = require('yargs')

const maxFixtures = typeof argv.max === 'number' ? argv.max : 5

/**
 * cli options:
 * {--max 5} - max 5 fixtures for each service
 * {--proxy http://xxx:xxx} - http proxy
 * {--force} - always download fixtures, otherwise skip if fixtures dir not empty
 * {--keep} - keep progress result
 */

main()

async function main() {
  const fixturesDir = path.join(__dirname, '..', '.fixtures')
  await fs.emptyDir(fixturesDir)

  const servicesDir = path.join(__dirname, '..', 'services')
  const serviceNames = await fs.readdir(servicesDir)

  const failedFixtures = []
  const bars = new ProgressBars()

  await Promise.all(
    serviceNames.map(async (serviceName) => {
      const fixtureDir = path.join(fixturesDir, serviceName)

      if (!argv.force) {
        try {
          const fixtures = await fs.readdir(fixtureDir)
          if (fixtures && fixtures.length > 0) {
            return
          }
        } catch (error) {
          // ignore if empty
        }
      }

      const downloadFixtures = require(path.join(
        servicesDir,
        serviceName,
        'fixtures'
      ))

      let exts
      try {
        exts = await downloadFixtures({ maxFixtures })
      } catch (error) {
        console.error(error)
        return
      }

      bars.addTotal(exts.length)

      for (const ext of exts) {
        bars.create(serviceName, ext.id)

        try {
          const html = await fetchText(ext.url)
          await fs.outputFile(
            path.join(fixtureDir, encodeURIComponent(ext.url)),
            html
          )
          bars.update(serviceName, ext.id, 'success')
        } catch (error) {
          bars.update(serviceName, ext.id, 'failed')
          failedFixtures.push(`${serviceName}/${ext.id}`)
        }
      }
    })
  )

  bars.stop()

  if (failedFixtures.length > 0) {
    console.error('\nFailed fixtures:\n\n' + failedFixtures.join('\n') + '\n')
  }
}
