var Util = {

    isResourceUrl: function(path) {
        return path && path.match(/\.jpg|jpeg|gif|png|swf|bmp|ico|css|js$/i);
    }

    // Is cached url
};

module.exports = Util;