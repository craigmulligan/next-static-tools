import React from 'react'
import PropTypes from 'prop-types'
import { ApolloProvider, getDataFromTree } from 'react-apollo'
import Head from 'next/head'
import initApollo from './initApollo'
import fs from 'fs-jetpack'
import { isExport, getComponentDisplayName, getBuildId } from './utils'
import { resolve } from 'path'

if (!String.prototype.endsWith) {
  String.prototype.endsWith = function(search, this_len) {
    if (this_len === undefined || this_len > this.length) {
      this_len = this.length
    }
    return this.substring(this_len - search.length, this_len) === search
  }
}

const getFileName = name => {
  if (name.endsWith('/')) {
    name = name.slice(0, -1)
  }

  if (!name) {
    name = '/index'
  }

  return name
}

export default ComposedComponent => {
  return class WithData extends React.Component {
    static displayName = `WithData(${getComponentDisplayName(
      ComposedComponent
    )})`

    static propTypes = {
      serverState: PropTypes.object.isRequired
    }

    static async getInitialProps(ctx) {
      let serverState = {}
      // Evaluate the composed component's getInitialProps()
      let composedInitialProps = {}
      if (ComposedComponent.getInitialProps) {
        composedInitialProps = await ComposedComponent.getInitialProps(ctx)
      }

      const url = {
        query: ctx.query,
        pathname: ctx.pathname,
        asPath: ctx.asPath
      }
      // Run all GraphQL queries in the component tree
      // and extract the resulting data

      if (!process.browser) {
        const options = JSON.parse(process.env.__NEXT_STATIC_TOOLS__)
        const apollo = initApollo({
          options
        })
        // Provide the `url` prop data in case a GraphQL query uses it
        try {
          // Run all GraphQL queries
          await getDataFromTree(
            <ApolloProvider client={apollo}>
              <ComposedComponent url={url} {...composedInitialProps} />
            </ApolloProvider>
          )
        } catch (error) {
          // Prevent Apollo Client GraphQL errors from crashing SSR.
          // Handle them in components via the data.error prop:
          // http://dev.apollodata.com/react/api-queries.html#graphql-query-data-error
          // eslint-disable-next-line no-console
          console.error(error)
        }
        // getDataFromTree does not call componentWillUnmount
        // head side effect therefore need to be cleared manually
        Head.rewind()

        const outDir = options.outdir || resolve('./out')
        const cachePath = `${outDir}/_next/${getBuildId(
          './.next'
        )}/data${getFileName(url.asPath || url.pathname)}.json`

        await fs.writeAsync(
          cachePath,
          JSON.stringify(apollo.cache.extract(), null, 2).replace(
            /</g,
            '\\u003c'
          )
        )

        // Extract query data from the Apollo store
        serverState = {
          data: apollo.cache.extract(),
          options
        }
      } else {
        const options = process.env.__NEXT_STATIC_TOOLS__
        if (isExport()) {
          try {
            const clientData = await fetch(
              `/_next/${window.__NEXT_DATA__.buildId}/data${getFileName(
                url.asPath || url.pathname
              )}.json`
            )
            .then(res => res.json())

            serverState = {
              data: clientData,
              options
            }
          } catch (err) {
            console.log(url)
            console.log(err)
          }
          
        } else {
          serverState = {
            options
          }
        }
      }

      return {
        serverState,
        ...composedInitialProps
      }
    }

    constructor(props) {
      super(props)
      this.apollo = initApollo(this.props.serverState)
    }

    componentDidMount() {
      if ('serviceWorker' in navigator && isExport()) {
        navigator.serviceWorker
          .register('/service-worker.js')
          // eslint-disable-next-line no-console
          .catch(err =>
            // eslint-disable-next-line no-console
            console.error('next-static-tools: Service worker registration failed', err)
          )
      } else {
        // eslint-disable-next-line no-console
        console.log('next-static-tools: Service worker not supported')
      }
    }

    render() {
      return (
        <ApolloProvider client={this.apollo}>
          <div>
            <ComposedComponent {...this.props} />
          </div>
        </ApolloProvider>
      )
    }
  }
}
