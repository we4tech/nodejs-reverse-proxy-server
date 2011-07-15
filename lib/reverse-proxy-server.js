var fs = require('fs'),
  http = require('http'),
  events = require('events');

this.ReverseProxyServer = function(options) {

  var EVENT_TYPE_ERROR = 'error';
  var EVENT_TYPE_SUCCESS = 'success';
  var EVENT_TYPE_PROCESS = 'process';
  var EVENT_TYPE_CONFIGURATION_ERROR = 'config.error';
  var EVENT_TYPE_LOG = 'log';

  var STATUS_SUCCESS = 200;
  var STATUS_ERROR = 500;
  var STATUS_NOT_FOUND = 404;

  var that = this;

  // Set server options
  this.optRootDirectory = options.rootDirectory || null;
  this.optVirtualHosts = options.virtualHosts || {
    '.+': [
      {host: 'localhost', port: 3000}
    ]
  };
  this.optClientEmitter = options.clientEmitter;

  // Set member variables
  this.mEvent = new events.EventEmitter();

  this.debug = function(message) {
    console.log('[DEBUG] - ' + message);
  };

  this.accessLog = function(request) {
    var combinedHeaders = [];
    var headers = request.headers;

    for (var headerKey in headers) {
      combinedHeaders.push(headerKey + ': ' + headers[headerKey]);
    }

    console.log(new Date().getTime() + ' ' + request.method + ' ' + request.url + ' Browser: ' + combinedHeaders.join(', '));
  };

  /**
   * Server proxy reverse, this process will fetch response
   * from the backend server and will send them back
   *
   * @param request client request
   * @param response client response
   */
  this.serveProxyReverse = function(request, response) {
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

  // Configure event listeners

  this.mEvent.on(EVENT_TYPE_LOG, function(type, request) {
    switch (type) {
      case 'access':
        that.accessLog(request);
      break;
    }
  });

  this.mEvent.on(EVENT_TYPE_CONFIGURATION_ERROR, function(response, message) {
    that.onConfigurationError(response, message);
  });

  this.onConfigurationError = function(response, message) {
    this.dispatchResponse(response, {
      status: STATUS_ERROR, content: message
    });
  };

  this.mEvent.on(EVENT_TYPE_ERROR, function(response, message) {
    that.onProcessingError(response, message);
  });

  this.onProcessingError = function(response, cause) {

  };

  this.mEvent.on(EVENT_TYPE_SUCCESS, function(response, headers, content) {
    that.onSuccess(response, headers, content);
  });

  this.onSuccess = function(response, payload) {
    this.debug('Response received now sending it to the server');
    this.dispatchResponse(response, {
      status: payload.status, headers: payload.headers, content: payload.content
    });
  };

  this.mEvent.on(EVENT_TYPE_PROCESS, function(request, response, buffer) {
    that.onProcessing(request, response, buffer);
  });

  this.onProcessing = function(request, response, buffer) {
    var headers = request.headers;
    this.handleWithinVirtualHostScope(request, response, headers.host, buffer);
  };

  this.handleWithinVirtualHostScope = function(request, response, host, buffer) {
    for (var vHostRegex in this.optVirtualHosts) {
      this.debug('Matching current host (' + host + ') with the regex(' + vHostRegex + ')');

      var regex = new RegExp(vHostRegex);
      regex.ignoreCase = true;

      if (host.match(regex)) {
        var backendServers = this.optVirtualHosts[vHostRegex];
        this.debug('Found Virtual Host, Listed Backend servers(' + backendServers.join(', ') + ')');

        // FIX: In future support backend selection strategy
        // FIX: For the time being take the first server
        var backendServerConf = backendServers[0];
        backendServerConf.targetHost = host;
        this.debug('Trying to send request by server(' + backendServerConf + ')');

        that.makeBackendServerRequest(request, response, backendServerConf, buffer);
      }
    }
  };

  this.makeBackendServerRequest = function(request, response, backendServerConf, buffer) {
    // Initiate http client connection
    var client = http.createClient(backendServerConf.port, backendServerConf.host);
    var clientHeaders = request.headers;

    // Explicitly set current host name
    clientHeaders['Host'] = backendServerConf.targetHost;

    var clientRequest = client.request(request.method, request.url, clientHeaders);

    clientRequest.on('response', function(res) {
      var datum = [];
      var bufferSize = 0;

      res.on('data', function(data) {
        bufferSize += data.length;
        datum.push(data);
      });

      res.on('end', function() {
        // Join buffer
        var contentBuffer = new Buffer(bufferSize);
        var offset = 0;

        for (var i = 0; i < datum.length; i++) {
          datum[i].copy(contentBuffer, offset);
          offset += datum[i].length;
        }

        that.debug("BufferSize(" + bufferSize + ") TargetBuffSize(" + contentBuffer.length + ")");
        var responseHeaders = res.headers;

        that.mEvent.emit(EVENT_TYPE_SUCCESS, response, {
          status: res.statusCode, headers: responseHeaders, content: contentBuffer
        });
      });
    });

    if ('post' == request.method.toLocaleLowerCase()) {
      clientRequest.write(buffer);
    }

    clientRequest.end();
  };

  this.dispatchResponse = function(response, payload) {
    var headers = {
      'Content-Type': 'text/html'
    };

    if (payload.headers) {
      for (var key in payload.headers) {
        headers[key] = payload.headers[key];
      }
    }

    that.debug('Sending request with the following payload');
    that.debug(payload.headers);

    response.writeHead(payload.status, headers);
    response.write(payload.content);
    response.end();
  };
};
