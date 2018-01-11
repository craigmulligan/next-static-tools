// Because next/router can only have one instance there are times when you may want to test the site 'next-static-tools' symlinked. In these cases you can configure TEST_REPO to the absolute path of the repo you've symlinked with and this will handle resolve to the correct next.js
const isDev = process.env.NEXT_STATIC_TOOLS_TEST_REPO ? true : false
const TEST_REPO = process.env.NEXT_STATIC_TOOLS_TEST_REPO
const relativeResolve = p => require.resolve(`${TEST_REPO}/node_modules/next/${p}`)

const devConfig = () => {
  return {
    plugins: [[
        require.resolve('babel-plugin-module-resolver'),
        {
          alias: {
            'next/link': relativeResolve('link'),
            'next/head': relativeResolve('head'),
            'next/router': relativeResolve('router')
          }
        }
    ]]
  }
}

module.exports = isDev ? devConfig() : {} 

