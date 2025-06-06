export { config }

const config: Readonly<{ [key: string]: any }> = {
  api_version: '1.2',
  servers: [
    'http://localhost:5001',
    //'https://simdb.iter.org/itpa/api',    
  ],
  serverConfig: {
    'http://localhost:5001': { 'requiresAuth': false },
    //'https://simdb.iter.org/itpa/api': { 'requiresAuth': false },
  },
  defaultServer: 'http://localhost:5001',
  searchFields: ['alias','summary.code.name','summary.heating_current_drive.power_additional.value','summary.global_quantities.ip.value', 'summary.local.magnetic_axis.b_field_tor.value','summary.simulation.description'],
  searchOutputFields: [
    'summary.code.name',
    'status',
    'uploaded_by'
  ],
  displayHeaders: [
    { label: 'Server', value: 'server' },
    { label: 'Simulation', value: 'uuid' },
    { label: 'Alias', value: 'alias' },
  ],
  // displayFields: 'all',
  displayFields: [    
    'summary.code.name',
    'ids',
    'summary.simulation.description',
    'status',
    'uploaded_by',
    'summary.ids_properties.creation_date'
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
