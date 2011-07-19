var http = require('http'),
    ProxyServer = require('./reverse-proxy-server/server');

module.exports = function(config) {
    var proxyServer = new ProxyServer.ReverseProxyServer(config);

    return http.createServer(function(request, response) {
        proxyServer.serveProxyReverse(request, response);
    });
};

