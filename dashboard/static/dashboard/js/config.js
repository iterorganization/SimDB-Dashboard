const config = {
    api_version: '1.1',
    servers: [
      'localhost:5000',
    ],
    defaultServer: 'localhost:5000',
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
    searchOutputColumns: [
        'alias',
        'status',
        'datetime',
    ],
    rootAPI: function (server) {
        return 'http://' + server + '/v' + config.api_version;
    }
}
