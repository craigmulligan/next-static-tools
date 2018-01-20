import PropTypes from 'prop-types'
import Link from 'next/link'
import Router from 'next/router'
import { execOnce, warn } from 'next/dist/lib/utils'
import exact from 'prop-types-exact'
import { format, resolve, parse } from 'url'

/**
 * @summary [Next.js Link](https://github.com/zeit/next.js/#with-link-1) component with data fetching capabilities
 * @name Link 
 * @public
 * @Class
 * @prop {Boolean} withData - Instructs component to fetch data for that page 
 * @returns {Object} Link component 
 * @example
 *
 * import Link from 'next-static-tools/link'
 * export default (props) => {
 *  return(
 *   <nav>
 *     <Link href='/'><a>Home</a></Link> // prefetches nothing 
 *     <Link href='/contact' prefetch><a>Home</a></Link> // prefetchs component 
 *     <Link href={ pathname='/about' query={ foo: 'bar' }} prefetch withData /> // prefetchs data and component 
 *   </nav> 
 *  )
 * }
 **/
// extend default next/link to customize the prefetch behaviour
export default class LinkWithData extends Link {
  // re defined Link propTypes to add `withData`
  static propTypes = exact({
    href: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
    as: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    prefetch: PropTypes.bool,
    replace: PropTypes.bool,
    shallow: PropTypes.bool,
    passHref: PropTypes.bool,
    scroll: PropTypes.bool,
    children: PropTypes.oneOfType([
      PropTypes.element,
      (props, propName) => {
        const value = props[propName]

        if (typeof value === 'string') {
          execOnce(warn)(
            `Warning: You're using a string directly inside <Link>. This usage has been deprecated. Please add an <a> tag as child of <Link>`
          )
        }

        return null
      }
    ]).isRequired,
    withData: PropTypes.bool // our custom prop
  })

  // our custom prefetch method
  async prefetch() {
    // if the prefetch prop is not defined or
    // we're running server side do nothing
    if (!this.props.prefetch) return
    if (typeof window === 'undefined') return

    const url =
      typeof this.props.href !== 'string'
        ? format(this.props.href)
        : this.props.href

    const { pathname } = window.location

    const href = resolve(pathname, url)

    const { query } =
      typeof this.props.href !== 'string' ? this.props.href : parse(url, true)

    const Component = await Router.prefetch(href)

    // if withData prop is defined, Component exists and has getInitialProps
    // fetch the component props (the component should save it in cache)
    if (this.props.withData && Component && Component.getInitialProps) {
      const ctx = { pathname: href, query, isVirtualCall: true, asPath: this.props.as }
      await Component.getInitialProps(ctx)
    }
  }
}
