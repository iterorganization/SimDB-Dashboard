import axios from 'axios'
import type { AxiosInstance } from 'axios'

export interface IMASUri {
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

export interface IDSNode {
  path: string
  name: string
  dtype: string
  shape: number[]
  description?: string
  units?: string
  parent_path?: string
}

export interface TimeSeriesData {
  name: string
  unit: string
  shape: number[]
  downsampled_shape: number[]
  ndim: number
  path: string
  description: string
  coordinates: Array<{
    name: string
    target: string
    unit: string
    shape: number[]
    downsampled_shape: number[]
    ndim: number
    path: string
    description: string
    coordinates: any[]
    shapes_dimension: boolean
    value: number[]
  }>
  value: number[]
}

export class IBEXIdsAPI {
  client: AxiosInstance
  private baseURL: string

  constructor(baseURL: string = '/api/ibex') {
    this.baseURL = baseURL
    this.client = axios.create({
      baseURL: baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  parseUri(uri: string): IMASUri {
    console.log('Parsing URI:', uri)
    let match = uri.match(/^imas:([^?]+)\?path=([^#]+)#([^:]+):(\d+)\/(.+)$/)
    if (match) {
      const [, protocol, path, ids, occurrence, nodePath] = match
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
    match = uri.match(/^imas:([^?]+)\?path=(.+)$/)
    if (match) {
      const [, backend, path] = match
      const pathParts = path.split('/')
      const database = pathParts[pathParts.length - 5] || 'unknown'
      const shot = parseInt(pathParts[pathParts.length - 4]) || 0
      const run = parseInt(pathParts[pathParts.length - 3]) || 0
      return {
        protocol: `imas:${backend}`,
        path,
        database,
        shot,
        run,
        occurrence: 0,
        ids: '',
        node_path: '',
        original: uri
      }
    }
    throw new Error(`Unable to parse URI: ${uri}`)
  }

  async listNodes(baseUri: string): Promise<IDSNode[]> {
    try {
      console.log('Listing nodes with URI:', baseUri)
      const params = new URLSearchParams()
      params.append('uri', baseUri)
      const response = await this.client.get('/data_entry/list_idses', { params })
      console.log('List IDSes response:', response.data)
      const nodes: IDSNode[] = []
      if (response.data.idses && Array.isArray(response.data.idses)) {
        response.data.idses.forEach((ids: any) => {
          if (ids.occurrences && Array.isArray(ids.occurrences)) {
            ids.occurrences.forEach((occ: any) => {
              nodes.push({
                path: `${ids.name}:${occ}`,
                name: `${ids.name}:${occ}`,
                dtype: 'IDS',
                shape: [],
                description: `${ids.name} (occurrence ${occ})`
              })
            })
          }
        })
      }
      console.log(`Found ${nodes.length} IDS nodes:`, nodes)
      return nodes
    } catch (error: any) {
      console.error('Failed to list nodes:', error)
      throw error
    }
  }

  async getPlotData(uri: string, showErrorBars: boolean = false): Promise<TimeSeriesData> {
    try {
      const params = new URLSearchParams()
      params.append('uri', uri)
      params.append('show_error_bars', showErrorBars ? 'true' : 'false')
      const response = await this.client.get('/data/plot_data', { params })
      if (response.data.data) {
        return response.data.data as TimeSeriesData
      }
      return response.data as TimeSeriesData
    } catch (error) {
      console.error('Failed to get plot data:', error)
      throw error
    }
  }

  async getNodeChildren(baseUri: string, idsName: string): Promise<IDSNode[]> {
    try {
      console.log(`Getting child nodes for ${idsName} in URI:`, baseUri)
      const name = idsName.includes(':') ? idsName.split(':')[0] : idsName
      const nodeUri = `${baseUri}#${name}`
      console.log('Node info URI:', nodeUri)
      const params = new URLSearchParams()
      params.append('uri', nodeUri)
      params.append('show_error_bars', 'true')
      const response = await this.client.get('/ids_info/node_info', { params })
      console.log('Node info response:', response.data)
      const children: IDSNode[] = []
      const extractNodes = (data: any, prefix = '', isRoot = true) => {
        if (Array.isArray(data)) {
          data.forEach((item: any) => {
            if (item.name) {
              const fullPath = isRoot ? item.name : (prefix ? `${prefix}/${item.name}` : item.name)
              children.push({
                path: fullPath,
                name: item.name,
                dtype: item.type || item.dtype || 'unknown',
                shape: item.shape || [item.ndim || 0],
                description: item.description,
                units: item.units
              })
            }
            if (item.children) {
              const newPrefix = isRoot ? item.name : (prefix ? `${prefix}/${item.name}` : item.name)
              extractNodes(item.children, newPrefix, false)
            }
          })
        } else if (data && typeof data === 'object') {
          if (data.name) {
            const fullPath = isRoot ? '' : (prefix || data.name)
            if (fullPath) {
              children.push({
                path: fullPath,
                name: data.name,
                dtype: data.type || data.dtype || 'unknown',
                shape: data.shape || [data.ndim || 0],
                description: data.description,
                units: data.units
              })
            }
          }
          if (data.children) {
            extractNodes(data.children, '', false)
          }
        }
      }
      extractNodes(response.data)
      console.log(`Found ${children.length} child nodes:`, children)
      return children
    } catch (error: any) {
      console.error('Failed to get node children:', error)
      return []
    }
  }

  async findFields(baseUri: string, idsName: string): Promise<string[]> {
    try {
      console.log(`Finding fields for ${idsName} in URI:`, baseUri)
      const name = idsName.includes(':') ? idsName.split(':')[0] : idsName
      const nodeUri = `${baseUri}#${name}`
      const params = new URLSearchParams()
      params.append('uri', nodeUri)
      const response = await this.client.get('/ids_info/node_info', { params })
      const fields: string[] = []
      const extractFieldNames = (data: any) => {
        if (Array.isArray(data)) {
          data.forEach((item: any) => {
            if (item.name) {
              fields.push(item.name)
            }
            if (item.children) {
              extractFieldNames(item.children)
            }
          })
        } else if (data && typeof data === 'object') {
          if (data.children) {
            extractFieldNames(data.children)
          }
        }
      }
      extractFieldNames(response.data)
      console.log(`Found ${fields.length} fields:`, fields)
      return fields
    } catch (error: any) {
      console.error('Failed to find fields:', error)
      return []
    }
  }
}

export const ibexIdsAPI = new IBEXIdsAPI('/api/ibex')