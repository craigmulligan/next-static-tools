export const getComponentDisplayName = Component => {
  return Component.displayName || Component.name || 'Unknown'
}

export const isServer = () => typeof window === 'undefined'

export const isExport = () =>
  // eslint-disable-next-line no-undef
  (typeof __NEXT_DATA__ !== 'undefined' && __NEXT_DATA__.nextExport) ||
  (!isServer() &&
    typeof window.__NEXT_DATA__ !== 'undefined' &&
    window.__NEXT_DATA__.nextExport)
