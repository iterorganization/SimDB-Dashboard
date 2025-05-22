export { config }

const config: Readonly<{ [key: string]: any }> = {
  api_version: '1.2',
  servers: [
    'https://simdb.iter.org/scenarios/api',
    //'https://simdb.iter.org/itpa/api',    
  ],
  serverConfig: {
    'https://simdb.iter.org/scenarios/api': { 'requiresAuth': false },
    //'https://simdb.iter.org/itpa/api': { 'requiresAuth': false },
  },
  defaultServer: 'https://simdb.iter.org/scenarios/api',
  searchFields: ['alias','summary.pulse','summary.code.name'],
  searchOutputFields: [
    'summary.pulse',
    'summary.code.name',
    'status',
    'uploaded_by'
  ],
  displayHeaders: [
    { label: 'Server', value: 'server' },
    { label: 'Simulation', value: 'uuid' },
    { label: 'Alias', value: 'alias' }
  ],
  // displayFields: 'all',
  displayFields: [
    'summary.pulse',
    'summary.code.name',
    'ids',
    'summary.simulation.description',
    'status',
    'uploaded_by',
    'creation_date'
  ],
  prefix: 'dashboard',
  searchOutputColumns: ['alias', 'status', 'datetime'],
  rootURL: function (server: string) {
    return server + '/'
  },
  rootAPI: function (server: string) {
    return server + '/v' + config.api_version
  }
}
