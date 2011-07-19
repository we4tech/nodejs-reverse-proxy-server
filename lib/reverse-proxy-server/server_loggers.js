var ServerLoggers = function(server) {

    server.debug = function(message) {
        if (server.optLogger) {
            server.optLogger.emit(EVENT_TYPE_LOG, 'debug', message);
        } else {
            console.log('[DEBUG] - ' + message);
        }
    };

    server.error = function(exception, message) {
        if (server.optLogger) {
            server.optLogger.emit(EVENT_TYPE_LOG, 'error',
                exception, message);
        } else {
            console.error(message);
            console.error(util.inspect(exception));
        }
    };

    server.accessLog = function(request) {
        if (server.optLogger) {
            server.optLogger.emit(EVENT_TYPE_LOG, 'debug', request);

        } else {
            var log = request.headers.host + ' - [' + new Date() + '] "' +
                request.method + ' ' + request.url + ' HTTP/' + request.httpVersion + '" 200 2122';
            console.log(log);

        }
    };
};

module.exports = {
    attach: function(server) {
        ServerLoggers(server);
    }
}