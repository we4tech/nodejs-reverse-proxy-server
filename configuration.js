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
    ],
	'hasansmac|servicedev1': [
      {host: 'localhost', port: 3000, rootDir: '/Users/hasan/projects/TasawrSingleSignOnService/public'}
    ],
	'scuttlehub.com': [
      {host: 'localhost', port: 3000, rootDir: '/Users/hasan/projects/StackBuilders/scuttlehub-mobile/public'}
    ],
	'static.sh.com': [
      {host: 'localhost', port: 3000, rootDir: '/Users/hasan/projects/StackBuilders/scuttlehub-mobile/sencha-touch-1.1.0/examples/forms'}
    ]
  },

  nodes: 2,
  bindPort: 80,
  bindHost: '0.0.0.0',
  backendSelectionStrategy: require('./lib/reverse-proxy-server/selection_strategy.js').random
};

module.exports = configuration;

