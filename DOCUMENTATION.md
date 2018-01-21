## Modules

<dl>
<dt><a href="#module_next-static-tools">next-static-tools</a></dt>
<dd></dd>
</dl>

## Classes

<dl>
<dt><a href="#Link">Link</a></dt>
<dd></dd>
</dl>

## Functions

<dl>
<dt><a href="#withData">withData()</a> ⇒ <code>Object</code></dt>
<dd></dd>
</dl>

<a name="module_next-static-tools"></a>

## next-static-tools

* [next-static-tools](#module_next-static-tools)
    * [~createServer(app)](#module_next-static-tools..createServer) ⇒ <code>Object</code>
    * [~build(dir, config)](#module_next-static-tools..build) ⇒ <code>Promise</code>

<a name="module_next-static-tools..createServer"></a>

### next-static-tools~createServer(app) ⇒ <code>Object</code>
**Kind**: inner method of [<code>next-static-tools</code>](#module_next-static-tools)  
**Summary**: Stand up next.js + graphql server  
**Returns**: <code>Object</code> - Server - An instance of Server  
**Access**: public  

| Param | Type | Description |
| --- | --- | --- |
| app | <code>Object</code> | A next.js app instance |

**Example**  
```js
import next from 'next'
import { createServer } from 'next-static-tools'

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const server = createServer(app)
// add yo custom middleware
server.get('/post/:id', (req, res) => {
  return app.render(req, res, '/post', {
    id: req.params.id
  })
})

server
  .start()
  .then(port => console.log(`server on http://localhost:${port}`))
  .catch(console.err)
```
<a name="module_next-static-tools..build"></a>

### next-static-tools~build(dir, config) ⇒ <code>Promise</code>
**Kind**: inner method of [<code>next-static-tools</code>](#module_next-static-tools)  
**Summary**: Build and export static site  
**Access**: public  

| Param | Type | Description |
| --- | --- | --- |
| dir | <code>String</code> |  |
| config | <code>Object</code> | the same object you would use in next.config.js - default {} |

**Example**  
```js
build()
  .then(() => process.exit())
  .catch(err => {
    console.log(err)
    process.exit(1)
  })
```
<a name="Link"></a>

## Link
**Kind**: global class  
**Summary**: [Next.js Link](https://github.com/zeit/next.js/#with-link-1) component with data fetching capabilities  
**Access**: public  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| withData | <code>Boolean</code> | Instructs component to fetch data for that page |

<a name="withData"></a>

## withData() ⇒ <code>Object</code>
**Kind**: global function  
**Summary**: HoC to wrap your pages, it provides the apollo client for data fetching  
**Returns**: <code>Object</code> - Link component  
**Access**: public  
**Properties**

| Name | Type | Description |
| --- | --- | --- |
| withData | <code>Boolean</code> | Instructs component to fetch data for that page |

**Example**  
```js
import App from '../components/App'
import header from '../components/header'
import posts from '../components/posts'

import withData from 'next-static-tools/withData'

export default withData(props => (
  <App>
    <Header pathname={props.url.pathname} />
    <hr />
    <Posts />
    <hr />
  </App>
))

Then in components/posts.js you can use apollo client query your graphql schema
import react, { component } from 'react'
import { graphql } from 'react-apollo'
import gql from 'graphql-tag'
import Link from 'next-static-tools/link'

const Posts = ({ data: { error, posts, loading } }) => {
  return (
    <article>
      <h3>Latest Posts</h3>
      {posts &&
        posts.map(p => {
          return (
            <div key={p.id}>
              <p>
                <span>{p.createdAt}</span>
                &nbsp;-&nbsp;
                <Link
                  prefetch
                  withData
                  href={{ pathname: `/post`, query: { id: p.id } }}
                  as={`/post/${p.id}`}
                >
                  <a>{p.title}</a>
                </Link>
              </p>
            </div>
          )
        })}
    </article>
  )
}

// We use the gql tag to parse our query string into a query document
const postsQuery = gql`
  query postsQuery {
    posts {
      id
      title
      createdAt
    }
  }
`

export default graphql(postsQuery)(Posts)
```
