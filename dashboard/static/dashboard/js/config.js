const config = {
    api_version: '1.1',
    servers: [
      'io-ls-simdb01.iter.org',
    ],
    defaultServer: 'io-ls-simdb01.iter.org',
    searchFields: [
        'alias',
        'database',
        'shot',
        'run',
        'workflow.name',
        'status',
    ],
    searchOutputFields: [
        'database',
        'shot',
        'run',
        'workflow.name',
        'status',
        'replaces',
        'replaced_by',
    ],
    displayHeaders: [
        {label: 'Server', value: 'server'},
        {label: 'Simulation', value: 'uuid'},
        {label: 'Alias', value: 'alias'},
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
        'description',
    ],
    prefix: 'dashboard',
    searchOutputColumns: [
        'alias',
        'status',
        'datetime',
    ],
    rootAPI: function (server) {
        return 'https://' + server + '/api/v' + config.api_version;
    }
}
