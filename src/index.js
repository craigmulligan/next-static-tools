const { parse } = require('url')
const { GraphQLServer } = require('graphql-yoga')
const swPrecache = require('sw-precache')

const middleware = (handle, options) => (req, res, next) => {
  const parsedUrl = parse(req.url, true)
  const { pathname } = parsedUrl

  if (
    pathname.startsWith(options.playground) ||
    pathname.startsWith(options.endpoint)
  ) {
    next()
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

export default async ({ typeDefs, resolvers, app, options }) => {
  const defaults = {
    playground: '/playground',
    endpoint: '/graphql',
    port: 5000,
    outdir: './out'
  }

  options = {
    ...defaults,
    ...options
  }

  process.env.__NEXT_STATIC_TOOLS__ = JSON.stringify(options)

  const server = new GraphQLServer({ typeDefs, resolvers })
  await writeServiceWorker(options.outdir)
  server.express.use(middleware(app.getRequestHandler(), options))
  server.start(options, () =>
    // eslint-disable-next-line no-console
    console.log(`server is running on http://localhost:${options.port}`)
  )
}
