window.__SIMDB_RUNTIME_CONFIG__ = {
  // Required runtime settings loaded by index.html.
  // This file is overwritten at docker-compose time for production and testing purposes.
  servers: [
    'SIMDB_SERVER_URL',
  ],
  defaultServer: 'SIMDB_SERVER_URL',
  serverConfig: {
    'SIMDB_SERVER_URL': { requiresAuth: false }
  },
  // Optional: metadata keys shown by default on a simulation page, or 'all'.
  // Omit to use the built-in list (src/config.ts).
  // displayFields: ['description', 'global_quantities.ip.value', 'global_quantities.b0.value'],
}
