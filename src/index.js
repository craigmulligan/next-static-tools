import express from 'express'
import bodyParser from 'body-parser'
import { graphqlExpress, graphiqlExpress } from 'apollo-server-express'
import { makeExecutableSchema } from 'graphql-tools'
import swPrecache from 'sw-precache'
import webpack from 'webpack'
import defaults from './defaults'
import nextExport from 'next/dist/server/export'
import nextBuild from 'next/dist/server/build'
import next from 'next'
import initApollo from './initApollo'

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

const getClientConfig = (config) => {
  const {
    endpoint,
    outdir,
    playground,
    port
  } = config

  return {
    endpoint,
    outdir,
    playground,
    port
  }
}

export default (app) => {
  const server = express()

  const config = {
   ...app.config,
   ...defaults
  }

  const schema = makeExecutableSchema({ typeDefs: 
    config.typeDefs, resolvers: config.resolvers })

  server.use(config.endpoint, bodyParser.json(), graphqlExpress({ schema }))
  server.use(
    config.playground,
    graphiqlExpress({ endpointURL: config.endpoint })
  ) // if you want GraphiQL enabled

  server.start = async (port = config.port) => {
    // set client config for server and client
    const clientConfig = getClientConfig({ ...config, port })
    process.env.__NEXT_STATIC_TOOLS__ = JSON.stringify(clientConfig)
    app.config.webpack = await getWebpack(clientConfig, app.config.webpack)
    
    if (app.dev) {
      await app.prepare()
    }

    // we assume the user has already added their middleware
    // so we add final catchall middleware
    server.use(app.getRequestHandler())
    server.listen(port)
    return port 
  }

  server.export = async () => {
    await app.close()
    // options => config :/ confusing
    const client = initApollo({ options: config }) 
    app.config.exportPathMap = app.config.exportPathMap(client) 
    await server.start()
    await nextBuild(app.dir, config)
    await nextExport(app.dir, config)
    await writeServiceWorker(config.outdir)
    return server
  }

  return server
}
