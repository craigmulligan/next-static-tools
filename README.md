# next-static-tools

> Toolkit for building graphql powered static sites with next.js

**Docs coming soon**

Usage: 

```
yarn add react react-dom next next-static-tools
```

Programmatic access
```javascript
const resolvers = require('./lib/resolvers')
const typeDefs = require('./lib/typeDefs')
const yargs = require('yargs')
const serve = require('next-static-tools').default

yargs
  .version()
  .command('dev', 'run dev server', () => {}, async () => {
    // initialize tools with next config + typeDefs and resolvers
    const server = serve({ typeDefs, resolvers })
    // run dev server
    server.start().then(({ port }) => console.log(`server on http://localhost:${port}`))
  })
  .command('export', 'export static site', () => {}, async (args) => {
    const server = serve({ typeDefs, resolvers })
    // start graphql server
    await server.start()
    // run next build/export
    await server.export()
    process.exit(0)
  })
  .argv
```

## Sites built with `next-static-tools`
* [hobochild.tk](http://hobochild.tk)
