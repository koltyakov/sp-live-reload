var fs = require('fs');
var spsave = require('spsave').spsave;
var path = require('path');

var spf = spf || {};
spf.reloadProvisioning = function(settings) {
    var spauth = require('node-sp-auth');
    var request = require('request-promise');

    var _self = this;
    _self.spr = null;
    _self.ctx = settings;

    var getAuthOptions = function(callback) {
        spauth.getAuth(_self.ctx.siteUrl, _self.ctx.creds)
            .then(function(options) {
                if (callback && typeof callback === "function") {
                    callback(options);
                }
            });
    };

    var getCachedRequest = function(spr) {
        spr = spr || require("sp-request").create(_self.ctx.creds);
        return spr;
    };

    _self.getSiteUserCustomActions = function(callback, errCallback) {
        _self.spr = getCachedRequest(_self.spr);
        _self.spr.get(_self.ctx.siteUrl + "/_api/site/usercustomactions")
            .then(function (response) {
                if (callback && typeof callback === "function") {
                    callback(response.body.d.results);
                }
            })
            .catch(function (err) {
                if (errCallback && typeof errCallback === "function") {
                    errCallback(err);
                }
            });
    };

    _self.getSiteData = function(callback, errCallback) {
        _self.spr = getCachedRequest(_self.spr);
        _self.spr.get(_self.ctx.siteUrl + "/_api/site")
            .then(function (response) {
                if (callback && typeof callback === "function") {
                    callback(response.body.d);
                }
            })
            .catch(function (err) {
                if (errCallback && typeof errCallback === "function") {
                    errCallback(err);
                }
            });
        // ServerRelativeUrl,Url
    };

    _self.provisionMonitoringAction = function(callback, errCallback) {

        _self.ctx.port = _self.ctx.port || 3000;
        _self.ctx.host = _self.ctx.host || "localhost";
        _self.ctx.protocol = _self.ctx.protocol || (_self.ctx.siteUrl.indexOf("https://") !== -1 ? "https" : "http");

        var devBaseUrl = _self.ctx.protocol + '://' + _self.ctx.host + ':' + _self.ctx.port;

        var deployClientScript = function(siteCollectionUrl, callback, errCallback) {
            var fileContent = String(fs.readFileSync(path.join(__dirname, "/../", "/static/live-reload.client.js")));
            fileContent = fileContent.replace(
                '"##settings#"',
                JSON.stringify({
                    protocol: _self.ctx.protocol,
                    host: _self.ctx.host || "localhost",
                    port: _self.ctx.port || 3000
                })
            );
            var core = {
                siteUrl: siteCollectionUrl || _self.ctx.siteUrl,
                flatten: false,
                checkin: true,
                checkinType: 1
            };
            var fileOptions = {
                fileName: 'live-reload.client.js',
                fileContent: fileContent,
                folder: '_catalogs/masterpage/spf/dev'
            };
            spsave(core, _self.ctx.creds, fileOptions)
                .then(function() {
                    if (callback && typeof callback === "function") {
                        callback();
                    }
                })
                .catch(function (err) {
                    if (errCallback && typeof errCallback === "function") {
                        errCallback(err);
                    }
                });
        };

        var provisionCustomAction = function(callback, errCallback) {
            _self.spr = getCachedRequest(_self.spr);
            var reqBody = {
                '__metadata': {
                    'type': 'SP.UserCustomAction'
                },
                'Title': 'LiveReloadCustomAction',
                'Location': 'ScriptLink',
                'Description': 'Live Reload Custom Action',
                'ScriptSrc': '~sitecollection/_catalogs/masterpage/spf/dev/live-reload.client.js',
                'Sequence': '10000'
            };

            _self.spr.requestDigest(_self.ctx.siteUrl)
                .then(function (digest) {
                    return _self.spr.post(_self.ctx.siteUrl +  "/_api/site/usercustomactions", {
                        headers: {
                            "X-RequestDigest": digest,
                            "Accept": "application/json; odata=verbose",
                            "Content-Type": "application/json; odata=verbose"
                        },
                        body: reqBody
                    });
                })
                .then(function (response) {
                    if (callback && typeof callback === "function") {
                        callback(response.body.d);
                    }
                })
                .catch(function (err) {
                    if (errCallback && typeof errCallback === "function") {
                        errCallback(err);
                    }
                });
        };

        (function() {
            _self.getSiteData(function(data) {
                deployClientScript(data.Url, function() {
                    _self.getSiteUserCustomActions(function(customActions) {
                        var cas = customActions.filter(function(ca) {
                            return ca.Title === 'LiveReloadCustomAction';
                        });
                        if (cas.length === 0) {
                            provisionCustomAction(callback, errCallback);
                        } else {
                            errCallback({
                                message: "Warning: Live Reload custom action has already been deployed. Skipped."
                            });
                        }
                    }, errCallback);
                }, errCallback);
            }, errCallback);
        })();
    };

    _self.retractMonitoringAction = function(callback, errCallback) {
        var deleteCustomAction = function(customActionId, callback, errCallback) {
            _self.spr = getCachedRequest(_self.spr);
            _self.spr.requestDigest(_self.ctx.siteUrl)
                .then(function (digest) {
                    return _self.spr.post(_self.ctx.siteUrl +  "/_api/site/usercustomactions('" + customActionId + "')", {
                        headers: {
                            "X-RequestDigest": digest,
                            "X-HTTP-Method": "DELETE"
                        }
                    });
                })
                .then(function (response) {
                    if (callback && typeof callback === "function") {
                        callback(response.body);
                    }
                })
                .catch(function (err) {
                    if (errCallback && typeof errCallback === "function") {
                        errCallback(err);
                    }
                });
        };

        (function() {
            _self.getSiteUserCustomActions(function(customActions) {
                customActions.forEach(function(ca) {
                    if (ca.Title === 'LiveReloadCustomAction') {
                        deleteCustomAction(ca.Id, callback, errCallback);
                    }
                });
            }, errCallback);
        })();
    };

    return _self;
};

module.exports = spf.reloadProvisioning;