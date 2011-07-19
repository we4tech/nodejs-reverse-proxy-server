var CachedData = {};

var StatCache = {};

exports.cachedData = CachedData;
exports.statCache = StatCache;

/**
 * Keep state of the previous selection and on the next request refer to the next server.
 *
 * @param host request host - this is for keeping the request reference
 * @param pServers the pool of backend clusters
 */
var RoundRobinStrategy = function(host, pServers) {
  var lastIndex = CachedData[host] || 0;
  var serverConf = null;

  if (typeof lastIndex == 'number') {
    if (pServers[++lastIndex]) {
      serverConf = pServers[lastIndex];
    } else {
      lastIndex = 0;
      serverConf = pServers[lastIndex];
    }
  }

  CachedData[host] = lastIndex;
  console.log('Serving for ' + host + ' index - ' + lastIndex);

  return serverConf;
};

RoundRobinStrategy.getVersion = function() {
  return "0.1";
};

RoundRobinStrategy.getInfo = function() {
  return "RoundRobin, Version: " + RoundRobinStrategy.getVersion();
};

// FIX: it requires top level observer, let's implement this strategy later.
exports.roundRobin = RoundRobinStrategy;

var RandomStrategy = function(nodeCache, host, pServers) {
  return pServers[parseInt(Math.floor(Math.random() * pServers.length), 10)];
};

RandomStrategy.getVersion = function() {
  return "0.1";
};

RandomStrategy.getInfo = function() {
  return "Random, Version: " + RandomStrategy.getVersion();
};

exports.random = RandomStrategy;