var cluster = require('cluster'),
    events = require('events'),
    configuration = require('./configuration'),
    nodeCache = require('./lib/reverse-proxy-server/multi_node_cache'),
    server = require('./lib/reverse-proxy-server');

configuration.nodeCache = nodeCache;

cluster(server(configuration))
  .use(cluster.logger('logs'))
  .use(cluster.stats())
  .use(cluster.pidfiles('pids'))
  .use(cluster.cli())
  .use(cluster.repl(8888))
  .listen(80);

