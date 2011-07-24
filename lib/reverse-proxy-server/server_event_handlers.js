var ServerEventHandlers = function(server) {

    server.mEvent.on(EVENT_TYPE_LOG, function(type, request) {
        switch (type) {
            case 'access':
                server.accessLog(request);
                break;
        }
    });

    server.mEvent.on(EVENT_TYPE_CONFIGURATION_ERROR, function(response, message) {
        server.onConfigurationError(response, message);
    });

    server.onConfigurationError = function(response, message) {
        server.dispatchResponse(response, {
            status: STATUS_ERROR, content: message
        });
    };

    server.mEvent.on(EVENT_TYPE_ERROR, function(response, message) {
        server.onProcessingError(response, message);
    });

    server.onProcessingError = function(response, cause) {

    };

    server.mEvent.on(EVENT_TYPE_BACKEND_ERROR, function(request, response, backendConf) {
        server.onBackendError(request, response, backendConf);
    });

    server.onBackendError = function(request, response, backendConf) {
        server.debug('Error found while processing backend ' + backendConf.host + ':' + backendConf.port);
        server.dispatchResponse(response, {
            status: STATUS_ERROR, content: 'Error found while processing backend ' +
                backendConf.host + ':' + backendConf.port
        });
    };

    server.mEvent.on(EVENT_TYPE_SUCCESS, function(response, headers, content) {
        server.onSuccess(response, headers, content);
    });

    server.onSuccess = function(response, payload) {
        server.debug('Response received now sending it to the server');
        server.dispatchResponse(response, {
            status: payload.status, headers: payload.headers, content: payload.content
        });
    };

    server.mEvent.on(EVENT_TYPE_PROCESS, function(request, response, buffer, backendConf) {
        server.onProcessing(request, response, buffer, backendConf);
    });

    server.onProcessing = function(request, response, buffer, backendConf) {
        server.handleWithinVirtualHostScope(request, response, buffer, backendConf);
    };

    server.handleWithinVirtualHostScope = function(request, response, buffer, backendServerConf) {
      server.debug('Trying to send request by server(' + util.inspect(backendServerConf) + ')');
      server.makeBackendServerRequest(request, response, backendServerConf, buffer);
    };

    server.makeBackendServerRequest = function(request, response, backendServerConf, buffer) {
        // Initiate http client connection
        var client = http.createClient(backendServerConf.port, backendServerConf.host);
        var clientHeaders = request.headers;

        // Explicitly set current host name
        clientHeaders['Host'] = backendServerConf.targetHost;

        var clientRequest = client.request(request.method, request.url, clientHeaders);

        client.addListener('error', function(e) {
            server.error(e, 'Failed to collect response from backend server');
            server.mEvent.emit(EVENT_TYPE_BACKEND_ERROR, request, response, backendServerConf);
        });

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

                server.debug("BufferSize(" + bufferSize + ") TargetBuffSize(" + contentBuffer.length + ")");
                var responseHeaders = res.headers;

                server.mEvent.emit(EVENT_TYPE_SUCCESS, response, {
                    status: res.statusCode, headers: responseHeaders, content: contentBuffer
                });
            });
        });

        if ('post' == request.method.toLocaleLowerCase()) {
            clientRequest.write(buffer);
        }

        clientRequest.end();
    };

    server.dispatchResponse = function(response, payload) {
        var headers = {
            'Content-Type': 'text/html',
            'Server': server.SERVER_NAME
        };

        if (payload.headers) {
            for (var key in payload.headers) {
                headers[key] = payload.headers[key];
            }
        }

        server.debug('Sending request with the following payload');
        server.debug(payload.headers);

        response.writeHead(payload.status, headers);
        response.write(payload.content);
        response.end();
    };
};

module.exports = {
    attach : function(server) {
        ServerEventHandlers(server);
    }
};