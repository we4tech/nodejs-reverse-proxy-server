var Util = {

  isResourceUrl: function(rootDir, path, callback) {
    if (path) {
      var parts = path.split('?');
      path = parts[0];
    }

    return (path && path.match(/\.jpg|jpeg|gif|png|swf|bmp|ico|css|js|html/i)
        && !path.match(/[&=]/i)
        && fsPath.existsSync(fsPath.join(rootDir, path)));
  }

  // Is cached url
};

module.exports = Util;