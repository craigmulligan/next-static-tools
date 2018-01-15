import initApollo from './initApollo'

export default options => {
  return initApollo({
    options: options || JSON.parse(process.env.__NEXT_STATIC_TOOLS__)
  })
}
