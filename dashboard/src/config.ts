export { config }

const config: Readonly<{ [key: string]: any }> = {
  api_version: '1.2',
  servers: [
    'http://localhost:5001',
  ],
  serverConfig: {
    'http://localhost:5001': { 'requiresAuth': false },
  },
  defaultServer: 'http://localhost:5001/',
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
