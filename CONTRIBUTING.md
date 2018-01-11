## Symlinking in development

During development a plain symlink won't work because next.js router requires a single instance. Therefore we have to resolve to a single next module. To do this follow the steps:

make next-static-tools linkable
```
yarn link
```

link them to the next-site you'd like to test (from the site in question)
```
yarn link next-static-tools
```

The we export a path used by babel to setup some aliases
```
export NEXT_STATIC_TOOLS_TEST_REPO=/path/to/test/site
```

Then do your thang!
