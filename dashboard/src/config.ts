export { config }

const config = {
  api_version: '1.2',
  servers: ['http://localhost:8000'],
  defaultServer: 'http://localhost:8000',
  searchFields: ['alias', 'database', 'shot', 'run', 'workflow.name', 'status'],
  searchOutputFields: [
    'database',
    'shot',
    'run',
    'workflow.name',
    'status',
    'replaces',
    'replaced_by'
  ],
  displayHeaders: [
    { label: 'Server', value: 'server' },
    { label: 'Simulation', value: 'uuid' },
    { label: 'Alias', value: 'alias' }
  ],
  // displayFields: 'all',
  displayFields: [
    'database',
    'shot',
    'run',
    'workflow.name',
    'status',
    'replaces',
    'replaced_by',
    'description'
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
