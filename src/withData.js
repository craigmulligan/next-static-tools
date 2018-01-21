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

/**
 * @summary HoC to wrap your pages, it provides the apollo client for data fetching
 * @name withData
 * @public
 * @function
 * @prop {Boolean} withData - Instructs component to fetch data for that page
 * @returns {Object} Link component
 * @example
 * import App from '../components/App'
 * import header from '../components/header'
 * import posts from '../components/posts'
 *
 * import withData from 'next-static-tools/withData'
 *
 * export default withData(props => (
 *   <App>
 *     <Header pathname={props.url.pathname} />
 *     <hr />
 *     <Posts />
 *     <hr />
 *   </App>
 * ))
 *
 * Then in components/posts.js you can use apollo client query your graphql schema
 * import react, { component } from 'react'
 * import { graphql } from 'react-apollo'
 * import gql from 'graphql-tag'
 * import Link from 'next-static-tools/link'
 *
 * const Posts = ({ data: { error, posts, loading } }) => {
 *   return (
 *     <article>
 *       <h3>Latest Posts</h3>
 *       {posts &&
 *         posts.map(p => {
 *           return (
 *             <div key={p.id}>
 *               <p>
 *                 <span>{p.createdAt}</span>
 *                 &nbsp;-&nbsp;
 *                 <Link
 *                   prefetch
 *                   withData
 *                   href={{ pathname: `/post`, query: { id: p.id } }}
 *                   as={`/post/${p.id}`}
 *                 >
 *                   <a>{p.title}</a>
 *                 </Link>
 *               </p>
 *             </div>
 *           )
 *         })}
 *     </article>
 *   )
 * }
 *
 * // We use the gql tag to parse our query string into a query document
 * const postsQuery = gql`
 *   query postsQuery {
 *     posts {
 *       id
 *       title
 *       createdAt
 *     }
 *   }
 * `
 *
 * export default graphql(postsQuery)(Posts)
 **/
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
            ).then(res => res.json())

            serverState = {
              data: clientData,
              options
            }
          } catch (err) {
            // eslint-disable-next-line no-console
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
            console.error(
              'next-static-tools: Service worker registration failed',
              err
            )
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
