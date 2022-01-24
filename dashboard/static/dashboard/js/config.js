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
