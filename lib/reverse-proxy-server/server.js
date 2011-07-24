fs = require('fs');
http = require('http');
events = require('events');
util = require('util');
static = require('node-static');

serverUtil = require('./util');
serverEventHandlers = require('./server_event_handlers');
serverLoggers = require('./server_loggers');

// Define constants
EVENT_TYPE_ERROR = 'error';
EVENT_TYPE_BACKEND_ERROR = 'backend.error';
EVENT_TYPE_SUCCESS = 'success';
EVENT_TYPE_PROCESS = 'process';
EVENT_TYPE_CONFIGURATION_ERROR = 'config.error';
EVENT_TYPE_LOG = 'log';

STATUS_SUCCESS = 200;
STATUS_ERROR = 500;
STATUS_NOT_FOUND = 404;

this.ReverseProxyServer = function(options) {

  this.VERSION = '0.1';
  this.SERVER_NAME = 'node-shuchi/' + this.VERSION;

  var that = this;

  // Set server options
  this.optRootDirectory = options.rootDirectory || null;
  this.optVirtualHosts = options.virtualHosts || {
    '.+': [
      {host: 'localhost', port: 3000}
    ]
  };
  this.optClientEmitter = options.clientEmitter;
  this.optLogger = options.logger;
  this.optBackendSelectionStrategy = options.backendSelectionStrategy;
  this.optNodeCache = options.nodeCache || {};
  this.optStaticServers = {};

  /**
   * Configure main event emitter
   */
  this.mEvent = new events.EventEmitter();

  /**
   * Attach server event handler
   */
  serverEventHandlers.attach(this);

  /**
   * Attach server logger
   */
  serverLoggers.attach(this);


  // Expose internal setup through debug output
  this.debug('Root Dir - ' + this.optRootDirectory);
  this.debug('Virtual Hosts - ' + this.optVirtualHosts);
  this.debug('Selection Strategy - ' + this.optBackendSelectionStrategy.getInfo());
  this.debug('Node initiated.');

  /**
   * Server proxy reverse, this process will fetch response
   * from the backend server and will send them back
   *
   * @param request client request
   * @param response client response
   */
  this.serveProxyReverse = function(request, response) {
    var backendServerConf = this.findBackendServerConfBasedOnVHost(request);

    if (serverUtil.isResourceUrl(request.url)) {
      this.debug('Serving - ' + request.url + ' as static file.');
      var instance = this.findStaticServer(request.headers.host, backendServerConf);
      instance.serve(request, response);

    } else {
      this.debug('Serving - ' + request.url + ' as dynamic request.');
      this.serverDynamicRequest(request, response, backendServerConf);
    }
  };

  this.findStaticServer = function(host, conf) {
    var key = host.toString().toLowerCase();
    var instance = this.optStaticServers[key];

    if (instance) {
      return instance;

    } else {
      instance = new static.Server(conf.rootDir);
      this.optStaticServers[key] = instance;

      return instance;
    }
  };

  this.findBackendServerConfBasedOnVHost = function(request) {
    var backendServers = [];
    var host = request.headers.host;

    for (var vHostRegex in this.optVirtualHosts) {
      this.debug('Matching current host (' + host + ') with the regex(' + vHostRegex + ')');

      var regex = new RegExp(vHostRegex, 'i');

      if (host.match(regex)) {
        this.debug('Found VHost - ' + vHostRegex + ' for ' + host);
        backendServers = this.optVirtualHosts[vHostRegex];
      }
    }

    this.debug('Found Virtual Host, Listed Backend - ');

    var backendServerConf = this.optBackendSelectionStrategy(this.optNodeCache, host, backendServers);
    backendServerConf.targetHost = host;

    return backendServerConf;
  };

  this.serverDynamicRequest = function(request, response, backendConf) {
    var postMethod = 'post' == request.method.toLowerCase();
    var that = this;
    var datum = [];
    var dataSize = 0;

    if (postMethod) {
      request.on('data', function(data) {
        datum.push(data);
        dataSize += data.length;
      });
    }

    request.on('end', function() {
      that.mEvent.emit(EVENT_TYPE_LOG, 'access', request);

      // Calculate data
      if (postMethod && dataSize > 0) {
        var buffer = new Buffer(dataSize);
        var offset = 0;

        for (var i = 0; i < datum.length; i++) {
          datum[i].copy(buffer, offset);
          offset += datum[i].length;
        }
      }

      process.nextTick(function() {
        if (that.optVirtualHosts.length == 0) {
          that.mEvent.emit(EVENT_TYPE_CONFIGURATION_ERROR, response, 'No virtual host was configured');
        } else {
          that.mEvent.emit(EVENT_TYPE_PROCESS, request, response, buffer, backendConf);
        }
      });
    });
  };
};
