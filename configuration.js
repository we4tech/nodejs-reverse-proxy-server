var configuration = {

  // Fix: Not yet static file serving supports
  rootDirectory: '/Users/hasan/proj_welltreat.us/public',

  // Setup backend server for the given server host regex
  virtualHosts: {
    '.+': [
      {host: 'localhost', port: 3000}
    ]
  },

  nodes: 2,
  bindPort: 80,
  bindHost: '0.0.0.0',
  backendSelectionStrategy: require('./lib/reverse-proxy-server/selection_strategy.js').random
};

module.exports = configuration;

