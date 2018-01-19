import express from 'express'
import bodyParser from 'body-parser'
import { graphqlExpress, graphiqlExpress } from 'apollo-server-express'
import { makeExecutableSchema } from 'graphql-tools'
import swPrecache from 'sw-precache'
import webpack from 'webpack'
import defaults from './defaults'
const nextExport = require('next/dist/server/export').default
const nextBuild = require('next/dist/server/build').default
import next from 'next'

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

export default ({ typeDefs, resolvers, options }) => {
  options = {
    ...defaults,
    ...options
  }

  const app = next(options)
  app.config.webpack = getWebpack(options, app.config.webpack)

  process.env.__NEXT_STATIC_TOOLS__ = JSON.stringify(options)

  const schema = makeExecutableSchema({ typeDefs, resolvers })

  server.use(options.endpoint, bodyParser.json(), graphqlExpress({ schema }))
  server.use(
    options.playground,
    graphiqlExpress({ endpointURL: options.endpoint })
  ) // if you want GraphiQL enabled

  server.start = async () => {
    // lastly add next.js request handler
    if (options.dev) {
      await app.prepare()
    }
    server.use(app.getRequestHandler())
    server.listen(options.port)
    return options
  }

  server.export = async () => {
    await server.start()
    await nextBuild(options.dir, options)
    await nextExport(options.dir, options)
    await writeServiceWorker(options.outdir)
    return server
  }

  return server
}
