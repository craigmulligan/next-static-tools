# next-static-tools

> A toolkit for building graphql powered static sites with next.js

`next-static-tools` is not a static site generator, it is collection of utilities to make building static sites with next.js and graphQL easier. 
Here is an [example](https://github.com/hobochild/with-next-static-tools) of how it works.

## Features 
 - Write your own graphql type definitions and resolvers = Super flexible data layer
 - Query data with the amazing Apollo Client
 - Prefetch both your javascript components and data for instant page transitions
 - Service workers by default
 - Familiar next.js workflow

## How does it work? 
You provide a graphql schema and `next-static-tools` stands up a graphql server, during development you can query this server directly like a regular web app. However when you build your static site, we write out the queries and their results to JSON files and configure the client to fetch data from the served JSON instead of the graphql server. Which allows you to use Apollo in your in your next.js static websites :)

## Why? 
I built `next-static-tools` because I love the way graphql allows you to query arbitrary data in a uniform way. It's a powerful tool to have when building static sites where data often comes from random sources. I don't like how many static site generators rely on conventions to organise your data or abstract the data model behind plugins. 
With `next-static-tools` you control your data because you control your graphql schema, the rest is just regular Next.js. 

NB: If you don't know graphql or don't want to learn, this tool isn't for you.

## Usage: 

[Documentation](DOCUMENTATION.md) 
[Example](https://github.com/hobochild/with-next-static-tools) 

```
yarn add react react-dom next next-static-tools
```

```javascript
const yargs = require('yargs')
const next = require('next')
const { build, createServer } = require('next-static-tools')

yargs
  .version()
  .command('dev', 'run dev server', () => {
    const dev = process.env.node_env !== 'production'
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
  })
  .command('export', 'export static site', () => {
    // starts the grapql server
    // compiles next.js components
    // exports static site
    build()
      .then(() => 'Your static site is ready!')
      .then(() => process.exit())
      .catch(err => {
        console.log(err)
        process.exit(1)
      })
  }).argv
  ```
 
## Sites built with `next-static-tools`: 
 - [hobochild.tk](https://hobochild.tk)

If you feel something is missing, not clear or could be improved, please don't hesitate to open an [issue in GitHub](https://github.com/hobochild/next-static-tools/issues/new), I'll be happy to help.

