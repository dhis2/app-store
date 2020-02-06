const debug = require('debug')('apphub:server:boot:webapp')

const webpack = require('webpack')

exports.compile = () =>
    new Promise((resolve, reject) => {
        if (process.env.USE_PREBUILT_APP) {
            debug('Using prebuilt web app')
            return resolve(null)
        }

        debug('Compiling web application...')
        const webpackConfig = require('../../webpack.config.js')
        webpack(webpackConfig, (err, stats) => {
            if (err) {
                debug(err.stack || err)
                if (err.details) {
                    debug(err.details)
                }
                return reject(err)
            }

            const info = stats.toJson()

            if (stats.hasErrors()) {
                debug(info.errors)
                return reject(err)
            }

            if (stats.hasWarnings()) {
                debug(info.warnings)
            }

            return resolve(stats)
        })
    })
