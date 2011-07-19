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

    /**
     * If root directory is defined set static server
     */
    if (this.optRootDirectory) {
        this.staticServer = new static.Server(this.optRootDirectory);
        this.staticServerEnabled = true;
    } else {
        this.staticServerEnabled = false;
    }

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

        if (this.staticServerEnabled && serverUtil.isResourceUrl(request.url)) {
            this.staticServer.serve(request, response);
        } else {
            this.serverDynamicRequest(request, response);
        }
    };

    this.serverDynamicRequest = function(request, response) {
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
                    that.mEvent.emit(EVENT_TYPE_PROCESS, request, response, buffer);
                }
            });
        });
    };
};
