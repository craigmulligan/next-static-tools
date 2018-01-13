import { ApolloClient } from 'apollo-client'
import { HttpLink } from 'apollo-link-http'
import { InMemoryCache } from 'apollo-cache-inmemory'
import fetch from 'isomorphic-fetch'
import { isExport } from './utils'
import get from 'lodash/get'
import { onError } from 'apollo-link-error'
import errorOverlay from 'apollo-error-overlay'

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
  }

  if (process.browser) {
    return window.__NEXT_STATIC_TOOLS__
  }
}

function create(initialState = {}) {
  const options = getOpts(initialState)
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

export default function initApollo(initialState) {
  // Make sure to create a new client for every server-side request so that data
  // isn't shared between connections (which would be bad)
  if (!process.browser) {
    return create(initialState)
  }
  let apolloClient
  // Reuse client on the client-side
  if (process.browser) {
    apolloClient = apolloClient || create(initialState)
  }

  return apolloClient
}
