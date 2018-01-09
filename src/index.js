const { parse } = require('url')
const { GraphQLServer } = require('graphql-yoga')

const middleware = (handle, options) => (req, res, next) => {
  const parsedUrl = parse(req.url, true)
  const { pathname } = parsedUrl

  if (
    pathname.startsWith(options.playground) ||
    pathname.startsWith(options.endpoint)
  ) {
    next()
  } else {
    handle(req, res, parsedUrl)
  }
}

export default ({ typeDefs, resolvers, app, options }) => {
  const defaults = {
    playground: '/playground',
    endpoint: '/graphql',
    port: 4000
  }

  options = {
    ...defaults,
    ...options
  }

  const server = new GraphQLServer({ typeDefs, resolvers })
  server.express.use(middleware(app.getRequestHandler(), options))
  server.start(options, () =>
    // eslint-disable-next-line no-console
    console.log(`server is running on localhost:${options.port}`)
  )
}
