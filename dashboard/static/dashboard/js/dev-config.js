const config = {
    api_version: '1.1',
    servers: [
      'localhost:5000',
    ],
    defaultServer: 'localhost:5000',
    searchFields: [
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
      return 'http://' + server + '/v' + config.api_version;
    }
}
