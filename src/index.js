const { parse } = require('url')
const { GraphQLServer } = require('graphql-yoga')
const { createReadStream } = require('fs')
const { join } = require('path')
const swPrecache = require('sw-precache')
import fs from 'fs-jetpack'

const middleware = (handle, options) => (req, res, next) => {
  const parsedUrl = parse(req.url, true)
  const { pathname } = parsedUrl

  if (
    pathname.startsWith(options.playground) ||
    pathname.startsWith(options.endpoint)
  ) {
    next()
  } else if (pathname === '/service-worker.js') {
    handle(req, res, parsedUrl)
    res.setHeader('content-type', 'text/javascript')
    createReadStream(join('./static', '/service-worker.js')).pipe(res)
  } else if (pathname === '__NEXT_STATIC_TOOLS__') {
    res.send(options)
  } else {
    handle(req, res, parsedUrl)
  }
}

const writeServiceWorker = rootDir => {
  return new Promise((resolve, reject) => {
    swPrecache.write(
      `${rootDir}/service-worker.js`,
      {
        staticFileGlobs: [
          rootDir + '/**/*.{js,.json,html,css,png,jpg,gif,svg,eot,ttf,woff}'
        ],
        stripPrefix: rootDir,
        runtimeCaching: [{
          urlPattern: /(.*)/,
          handler: 'networkFirst'
        }]
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

export default async ({ typeDefs, resolvers, app, options }) => {
  const defaults = {
    playground: '/playground',
    endpoint: '/graphql',
    port: 4000
  }

  options = {
    ...defaults,
    ...options
  }

  process.env.__NEXT_STATIC_TOOLS__ = JSON.stringify(options)

  const server = new GraphQLServer({ typeDefs, resolvers })
  await writeServiceWorker('./out')
  server.express.use(middleware(app.getRequestHandler(), options))
  server.start(options, () =>
    // eslint-disable-next-line no-console
    console.log(`server is running on http://localhost:${options.port}`)
  )
}
