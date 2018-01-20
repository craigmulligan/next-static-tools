/**
 * @module next-static-tools 
*/
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
import fs from 'fs-jetpack'
import { resolve } from 'path'
import nextGetConfig from 'next/dist/server/config'

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

const getWebpack = (userConfig) => {
  return async (config, nextOpts) => {
    if (userConfig.webpack) {
      // if the user defines a webpack config fn we need to run it first
      config = await userConfig.webpack(config, nextOpts)
    }

    config.plugins.push(
      new webpack.DefinePlugin({
        'process.env.__NEXT_STATIC_TOOLS__': JSON.stringify(getClientConfig(config))
      })
    )

    return config
  }
}


const prepConfig = (config) => {
  // set client config for server and client
  // make client config available to webpack build
  const clientConfig = getClientConfig(config)
  process.env.__NEXT_STATIC_TOOLS__ = JSON.stringify(clientConfig)
  config.webpack = getWebpack(clientConfig, config.webpack)

  // make the client available to the exportPathsFn
  const client = initApollo({ options: config }) 
  const exportPathsFn = config.exportPathMap
  config.exportPathMap = () => {
    return exportPathsFn(client) 
  }

  return config
}

class Server {
  constructor(app) {
    this.config = prepConfig({
      ...defaults,
      ...app.config,
    })

    this.express = express()
    this.nextApp = app
    this.nextApp.config = this.config

    const schema = makeExecutableSchema({ typeDefs: 
      this.config.typeDefs, resolvers: this.config.resolvers })

    this.express.use(this.config.endpoint, bodyParser.json(), graphqlExpress({ schema }))
    this.express.use(
      this.config.playground,
      graphiqlExpress({ endPointUrl: this.config.endpoint })
    )    
  }

  get(path, callback) {
    return this.express.get(path, callback)
  }

  use(path, callback) {
    return this.express.use(path, callback)
  }

  post(path, callback) {
    return this.express.post(path, callback)
  }

  start = async () => {
    if (this.nextApp.prepare && this.nextApp.dev) {
      await this.nextApp.prepare()
      this.express.use(this.nextApp.getRequestHandler())
    }

    this.express.listen(this.config.port)
    return this.config.port 
  }
}

/**
 * @summary Stand up next.js + graphql server 
 * @name createServer 
 * @public
 * @function
 * @param {Object} app - A next.js app instance
 * @returns {Object} Server - An instance of Server 
 * @example
 * import next from 'next'
 * import { createServer } from 'next-static-tools'
 *
 * const dev = process.env.NODE_ENV !== 'production'
 * const app = next({ dev })
 * const server = createServer(app)
 * // add yo custom middleware
 * server.get('/post/:id', (req, res) => {
 *   return app.render(req, res, '/post', {
 *     id: req.params.id
 *   })
 * })
 * 
 * server
 *   .start()
 *   .then(port => console.log(`server on http://localhost:${port}`))
 *   .catch(console.err)
 **/
export const createServer = (app) => {
  return new Server(app)
}

/**
 * @summary Build and export static site 
 * @name build 
 * @public
 * @function
 * @param {String} dir 
 * @param {Object} config the same object you would use in next.config.js - default {}
 * @returns {Promise} 
 * @example
 * build()
 *   .then(() => process.exit())
 *   .catch(err => {
 *     console.log(err)
 *     process.exit(1)
 *   })
 *
 **/
export const build = async (dir = process.cwd(), configuration) => {
  const config = prepConfig({
    ...defaults,
    ...nextGetConfig(dir, configuration),
  })

  // start graphql so it's accessible when exporting
  const server = new Server({ config })
  await server.start()

  await nextBuild(dir, config)
  // we have merged options & config
  // it seems saner way to manage things,
  // but we still have to pass both objects to next
  await nextExport(dir, config, config)  
  await writeServiceWorker(config.outdir) 
}
