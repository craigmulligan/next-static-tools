import React from 'react'
import PropTypes from 'prop-types'
import { ApolloProvider, getDataFromTree } from 'react-apollo'
import Head from 'next/head'
import initApollo from './initApollo'
import fs from 'fs-jetpack'
import { isExport, getComponentDisplayName, getBuildId } from './utils'
import { resolve } from 'path'

const Fragment =
  React.Fragment ||
  function Fragment({ children }) {
    return children
  }

const getFileName = name => (name.endsWith('/') ? `${name}index` : name)

const Config = ({ options }) => {
  return (
    <Fragment>
      {options ? (
        <script
          dangerouslySetInnerHTML={{
            __html: `__NEXT_STATIC_TOOLS__ = ${JSON.stringify(options)}`
          }}
        />
      ) : (
        <div />
      )}
    </Fragment>
  )
}

Config.propTypes = {
  options: PropTypes.object.isRequired
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

      const url = { query: ctx.query, pathname: ctx.pathname }
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
          console.log(error)
        }
        // getDataFromTree does not call componentWillUnmount
        // head side effect therefore need to be cleared manually
        Head.rewind()

        // currently you can't configure the out dir
        const outDir = resolve('./out')
        const cachePath = `${outDir}/static/${getBuildId(
          './.next'
        )}/data${getFileName(url.pathname)}.json`

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
        if (process.browser && isExport()) {
          const clientData = await fetch(
            `/static/${window.__NEXT_DATA__.buildId}/data${getFileName(
              url.pathname
            )}.json`
          ).then(res => res.json())

          serverState = {
            data: clientData
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
      if ('serviceWorker' in navigator) {
        //        navigator.serviceWorker.register("/sw.js")
        //         .catch(err => console.error("Service worker registration failed", err));
      } else {
        //  console.log("Service worker not supported");
      }
    }

    render() {
      return (
        <ApolloProvider client={this.apollo}>
          <div>
            <ComposedComponent {...this.props} />
            <Config options={this.props.serverState.options} />
          </div>
        </ApolloProvider>
      )
    }
  }
}
