var http = require('http');
var server = require('./lib/reverse-proxy-server.js');

var configuration = {
  // Fix: Not yet static file serving supports
  rootDirectory: '/Users/hasan/proj_welltreat.us/public',

  // Setup backend server for the given server host regex
  virtualHosts: {
    '.+': [
      {
        host: 'localhost', port: 3000
      }
    ]
  }
};

// Configure proxy server
var proxyServer = new server.ReverseProxyServer(configuration);

http.createServer(function(request, response) {
  proxyServer.serveProxyReverse(request, response);
}).listen(80);

console.log('Server started.');