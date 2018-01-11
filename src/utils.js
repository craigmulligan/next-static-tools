import fs from 'fs-jetpack'
import { join } from 'path'

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

export const getBuildId = nextDir => {
  return fs.read(join(nextDir, 'BUILD_ID'), 'utf8')
}
