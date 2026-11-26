export { config }

type ServerConfig = {
  requiresAuth: boolean
}

type RuntimeConfig = {
  servers: string[]
  serverConfig: Record<string, ServerConfig>
  defaultServer: string
  /** Metadata keys shown by default on a simulation page, or 'all' */
  displayFields?: string[] | 'all'
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

const fields = runtimeConfig.displayFields
if (
  fields !== undefined &&
  fields !== 'all' &&
  !(Array.isArray(fields) && fields.every((f) => typeof f === 'string'))
) {
  throw new Error('Invalid runtime configuration: "displayFields" must be a list of metadata keys or \'all\'.')
}

const servers = runtimeConfig.servers
const serverConfig = runtimeConfig.serverConfig
const defaultServer = runtimeConfig.defaultServer

// Used when runtime-config.js has no displayFields; rows without a value show "No data available."
const defaultDisplayFields = [
  'description',
  'code.name',
  'status',
  'machine',
  'pulse',
  'global_quantities.ip.value',
  'global_quantities.b0.value',
  'global_quantities.h_mode.value',
  'line_average.n_e.value',
  'local.magnetic_axis.n_e.value',
  'local.separatrix.n_e.value',
  'line_average.zeff.value',
  'local.magnetic_axis.zeff.value',
  'local.separatrix.zeff.value',
  'volume_average.meff_hydrogenic.value',
  'heating_current_drive.power_additional.value',
  'heating_current_drive.power_ec.value',
  'heating_current_drive.power_ic.value',
  'heating_current_drive.power_nbi.value',
  'heating_current_drive.power_lh.value',
  'global_quantities.power_loss.value',
  'ids',
  'ids_properties.creation_date'
]

const config: Readonly<{ [key: string]: any }> = {
  api_version: '1.3',
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
  displayFields: fields ?? defaultDisplayFields,
  prefix: 'dashboard',
  searchOutputColumns: ['alias/UUID', 'status', 'Upload Date'],
  rootURL: function (server: string) {
    return server + '/'
  },
  rootAPI: function (server: string) {
    return server + '/v' + config.api_version
  }
}
