var Util = {

  isResourceUrl: function(path) {
    if (path) {
      var parts = path.split('?');
      path = parts[0];
    }
    return path && path.match(/\.jpg|jpeg|gif|png|swf|bmp|ico|css|js/i) && !path.match(/[&=]/i);
  }

  // Is cached url
};

module.exports = Util;