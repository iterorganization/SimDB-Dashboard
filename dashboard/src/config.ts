export { config }

type ServerConfig = {
  requiresAuth: boolean
}

type RuntimeConfig = {
  servers: string[]
  serverConfig: Record<string, ServerConfig>
  defaultServer: string
}

const runtimeConfig = (globalThis as { __SIMDB_RUNTIME_CONFIG__?: RuntimeConfig }).__SIMDB_RUNTIME_CONFIG__

if (!runtimeConfig) {
  throw new Error('Missing required runtime configuration: window.__SIMDB_RUNTIME_CONFIG__.')
}

if (!Array.isArray(runtimeConfig.servers) || runtimeConfig.servers.length === 0) {
  throw new Error('Invalid runtime configuration: "servers" must be a non-empty array.')
}

if (!runtimeConfig.serverConfig || typeof runtimeConfig.serverConfig !== 'object') {
  throw new Error('Invalid runtime configuration: "serverConfig" must be an object.')
}

if (typeof runtimeConfig.defaultServer !== 'string' || runtimeConfig.defaultServer.length === 0) {
  throw new Error('Invalid runtime configuration: "defaultServer" must be a non-empty string.')
}

const servers = runtimeConfig.servers
const serverConfig = runtimeConfig.serverConfig
const defaultServer = runtimeConfig.defaultServer

const config: Readonly<{ [key: string]: any }> = {
  api_version: '1.2',
  data_api_version: '1.3',
  servers,
  serverConfig,
  defaultServer,
  searchFields: ['alias', 'code.name', 'global_quantities.ip.value', 'global_quantities.b0.value', 'heating_current_drive.power_additional.value', 'description'],
  searchOutputFields: [
    'code.name',
    'status',
    'uploaded_by'
  ],
  displayHeaders: [
    { label: 'Server', value: 'server' },
    { label: 'Simulation', value: 'uuid' },
    { label: 'Alias', value: 'alias' },
    { label: 'Upload Info', value: 'upload_info' },
  ],
  // displayFields: 'all',
  displayFields: [    
    'code.name',
    'ids',
    'description',
    'status',
    'ids_properties.creation_date'
  ],
  prefix: 'dashboard',
  searchOutputColumns: ['alias/UUID', 'status', 'Upload Date'],
  rootURL: function (server: string) {
    return server + '/'
  },
  rootAPI: function (server: string) {
    return server + '/v' + config.api_version
  }
}
