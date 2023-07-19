const config = {
    api_version: '1.2',
    servers: [
      'simdb.iter.org/scenarios',
      'simdb.iter.org/itpa',
    ],
    defaultServer: 'simdb.iter.org/scenarios',
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
    rootURL: function (server) {
        return 'https://' + server + '/';
    },
    rootAPI: function (server) {
        return 'https://' + server + '/v' + config.api_version;
    }
}
