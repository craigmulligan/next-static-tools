import { ApolloClient } from 'apollo-client'
import { HttpLink } from 'apollo-link-http'
import { InMemoryCache } from 'apollo-cache-inmemory'
import fetch from 'isomorphic-fetch'
import { isExport } from './utils'
import get from 'lodash/get'
import { onError } from 'apollo-link-error'
import errorOverlay from 'apollo-error-overlay'
import defaults from './defaults'

const errorLink = onError(errors => {
  errorOverlay(errors)
  //if (networkError) errorOverlay(`[Network error]: ${networkError}`);
})

// Polyfill fetch() on the server (used by apollo-client)
if (!process.browser) {
  global.fetch = fetch
}

const fetchPolicy = () =>
  isExport() && process.browser ? 'cache-only' : 'cache-first'

const getOpts = state => {
  if (get(state, 'options')) {
    return state.options
  } else {
    return defaults
  }
}

function create(initialState = {}) {
  const options = getOpts(initialState)
  console.log({ options })
  const port = options.port || 4000 // we should make this configurable at some point
  const endpoint = options.endpoint || '/graphql' // this too.

  const link = new HttpLink({
    uri: `http://localhost:${port}${endpoint}`, // Server URL (must be absolute)
    opts: {
      credentials: 'same-origin' // Additional fetch() options like `credentials` or `headers`
    }
  })

  return new ApolloClient({
    connectToDevTools: process.browser,
    ssrMode: !process.browser, // Disables forceFetch on the server (so queries are only run once)
    link: errorLink.concat(link),
    cache: new InMemoryCache().restore(initialState.data),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: fetchPolicy()
      },
      query: {
        fetchPolicy: fetchPolicy()
      }
    }
  })
}

export default create
