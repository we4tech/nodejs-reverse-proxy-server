var configuration = {

  // Fix: Not yet static file serving supports
  // FIX: Make it multi domain supports  

  // Setup backend server for the given server host regex
  virtualHosts: {
	'herry\.com\.sa': [
		{host: 'localhost', port: 3000, rootDir: '/Users/hasan/projects/tasawr-car-rental/public'}
	],
    'hadok': [
      {host: 'localhost', port: 3000, rootDir: '/Users/hasan/proj_welltreat.us/public'}
    ]
  },

  nodes: 2,
  bindPort: 80,
  bindHost: '0.0.0.0',
  backendSelectionStrategy: require('./lib/reverse-proxy-server/selection_strategy.js').random
};

module.exports = configuration;

