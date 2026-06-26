/**
 * URI parsing and formatting utilities for IMAS/IBEX
 */

export interface ParsedIMASUri {
  protocol: string
  path: string
  database: string
  shot: number
  run: number
  occurrence: number
  ids: string
  node_path: string
  original: string
}

/**
 * Parse IMAS URI into components
 * @param uri Full IMAS URI string
 * @returns Parsed URI components
 */
export function parseIMASUri(uri: string): ParsedIMASUri {
  // Try format 1: imas:protocol?path=...#ids:occ/node/path
  let pattern = /^imas:([^?]+)\?path=([^#]+)#([^:]+):(\d+)\/(.+)$/
  let match = uri.match(pattern)
  
  if (match) {
    const [, protocol, path, ids, occurrence, nodePath] = match
    
    // Extract metadata from path
    const pathParts = path.split('/')
    const database = pathParts[pathParts.length - 5] || 'unknown'
    const shot = parseInt(pathParts[pathParts.length - 4]) || 0
    const run = parseInt(pathParts[pathParts.length - 3]) || 0

    return {
      protocol: `imas:${protocol}`,
      path,
      database,
      shot,
      run,
      occurrence: parseInt(occurrence),
      ids,
      node_path: nodePath,
      original: uri
    }
  }

  // Try format 2: imas:backend?path=/path (simplified)
  pattern = /^imas:([^?]+)\?path=(.+)$/
  match = uri.match(pattern)
  
  if (match) {
    const [, protocol, path] = match
    
    // Extract metadata from path
    const pathParts = path.split('/').filter(p => p.length > 0)
    const database = pathParts[pathParts.length - 4] || 'unknown'
    const shot = parseInt(pathParts[pathParts.length - 3]) || 0
    const run = parseInt(pathParts[pathParts.length - 2]) || 0
    const occurrence = parseInt(pathParts[pathParts.length - 1]) || 0

    return {
      protocol: `imas:${protocol}`,
      path,
      database,
      shot,
      run,
      occurrence,
      ids: protocol,
      node_path: '',
      original: uri
    }
  }

  throw new Error(`Invalid IMAS URI: ${uri}. Expected imas:backend?path=... or imas:backend?path=...#ids:occ/node`)
}

/**
 * Format node path to human-readable string
 * @param path Node path like 'core_profiles:0/profiles_2d'
 * @returns Formatted string like 'Core Profiles / Profiles 2D'
 */
export function formatNodePath(path: string): string {
  return path
    .split('/')
    .map(part => {
      // Remove occurrence number (e.g., ':0')
      const clean = part.replace(/:.*$/, '')
      // Convert snake_case to Title Case
      return clean
        .split('_')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    })
    .join(' / ')
}

/**
 * Format URI to readable label
 * Converts old format to new simplified format
 * @param uri Full IMAS URI
 * @returns Readable label and simplified URI
 */
export function formatUri(uri: string): string {
  try {
    // Handle old format: imas://uda.iter.org/uda?path=/path&backend=hdf5
    const oldFormatMatch = uri.match(/^imas:\/\/([^/]+)\/([^?]+)\?path=([^&]+)&backend=([^&]+)/)
    if (oldFormatMatch) {
      const [, , , path] = oldFormatMatch
      const pathParts = path.split('/')
      const database = pathParts[pathParts.length - 4]
      const shot = pathParts[pathParts.length - 3]
      const run = pathParts[pathParts.length - 2]
      return `${database} / Shot ${shot} / Run ${run}`
    }

    // Handle new simplified format: imas:backend?path=/path
    const newFormatMatch = uri.match(/^imas:([^?]+)\?path=(.+)$/)
    if (newFormatMatch) {
      const [, backend, path] = newFormatMatch
      const pathParts = path.split('/')
      const database = pathParts[pathParts.length - 4]
      const shot = pathParts[pathParts.length - 3]
      const run = pathParts[pathParts.length - 2]
      return `${database} / Shot ${shot} / Run ${run}`
    }

    // Handle format with nodes: imas:hdf5?path=...#ids:occ/node/path
    const nodeFormatMatch = uri.match(/#([^:]+):(\d+)\/(.+)$/)
    if (nodeFormatMatch) {
      const [, ids, occurrence, nodePath] = nodeFormatMatch
      return `${ids}:${occurrence} / ${formatNodePath(nodePath)}`
    }
  } catch (e) {
    console.warn('Failed to format URI:', uri, e)
  }
  return uri
}

/**
 * Check if node looks like time-series data
 * @param nodePath Node path to check
 * @returns True if appears to be time-series
 */
export function isTimeSeriesUri(nodePath: string): boolean {
  const non_timeseries = ['profiles_', 'grid', 'coordinate', 'equilibrium']
  return !non_timeseries.some(term => nodePath.includes(term))
}

/**
 * Build URI for listing nodes
 * @param parsedUri Already parsed URI
 * @returns URI suitable for list operation
 */
export function buildListUri(parsedUri: ParsedIMASUri): string {
  return `${parsedUri.protocol}?path=${parsedUri.path}#${parsedUri.ids}:${parsedUri.occurrence}`
}

/**
 * Build URI for specific node
 * @param parsedUri Already parsed URI
 * @param nodePath Node path within IDS
 * @returns Full URI for specific node
 */
export function buildNodeUri(parsedUri: ParsedIMASUri, nodePath: string): string {
  return `${parsedUri.protocol}?path=${parsedUri.path}#${parsedUri.ids}:${parsedUri.occurrence}/${nodePath}`
}

/**
 * Validate IMAS URI format
 * @param uri URI to validate
 * @returns True if valid IMAS URI format
 */
export function validateIMASUri(uri: string): boolean {
  const pattern = /^imas:([^?]+)\?path=([^#]+)#([^:]+):(\d+)\/(.+)$/
  return pattern.test(uri)
}
