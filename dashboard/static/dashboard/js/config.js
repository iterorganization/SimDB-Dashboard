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
    ],
    displayFields: [
        'database',
        'shot',
        'run',
        'workflow.name',
        'status',
        'description',
    ],
    rootAPI: function (server) {
        return 'https://' + server + '/api/v' + config.api_version;
    }
}
