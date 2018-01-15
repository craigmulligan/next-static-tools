import express from 'express'
import bodyParser from 'body-parser'
import { graphqlExpress, graphiqlExpress } from 'apollo-server-express'
import { makeExecutableSchema } from 'graphql-tools'
import swPrecache from 'sw-precache'
import webpack from 'webpack'
import defaults from './defaults'
import asyncOnExit from 'async-on-exit'

const server = express()

const writeServiceWorker = rootDir => {
  return new Promise((resolve, reject) => {
    swPrecache.write(
      `${rootDir}/service-worker.js`,
      {
        stripPrefix: rootDir,
        runtimeCaching: [
          {
            urlPattern: /(.*)/,
            handler: 'networkFirst'
          }
        ]
      },
      (err, data) => {
        if (err) {
          reject(err)
        }
        resolve(data)
      }
    )
  })
}

const getWebpack = (options, userConfig) => {
  return async (config, nextOpts) => {
    if (userConfig) {
      // if the user defines a webpack config fn we need to run it first
      config = await userConfig(config, nextOpts)
    }

    config.plugins.push(
      new webpack.DefinePlugin({
        'process.env.__NEXT_STATIC_TOOLS__': JSON.stringify(options)
      })
    )

    return config
  }
}

export default async ({ typeDefs, app, resolvers, options }) => {
  options = {
    ...defaults,
    ...options
  }

  app.config.webpack = getWebpack(options, app.config.webpack)
  process.env.__NEXT_STATIC_TOOLS__ = JSON.stringify(options)

  const schema = makeExecutableSchema({ typeDefs, resolvers })

  server.use(options.endpoint, bodyParser.json(), graphqlExpress({ schema }))
  server.use(
    options.playground,
    graphiqlExpress({ endpointURL: options.endpoint })
  ) // if you want GraphiQL enabled

  server.start = cb => {
    // lastly add next.js request handler
    server.use(app.getRequestHandler())
    server.listen(options.port)
    typeof cb === 'function' && cb(options)
  }

  asyncOnExit(() => {
    // this is a hack so that we can write out service worker file to the output dir *after* it's rimraffed
    if (!app.dev) {
      return writeServiceWorker(options.outdir)
    }
  })

  return server
}
