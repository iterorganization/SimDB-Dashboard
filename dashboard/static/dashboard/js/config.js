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
    rootAPI: function (server) {
        return 'https://' + server + '/api/v' + config.api_version;
    }
}
