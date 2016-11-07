var fs = require('fs');
var path = require('path');

var spf = spf || {};
spf.liveReload = function(settings) {
    var _self = this;
    _self.settings = settings || {};
    _self.settings.ssl = _self.settings.ssl || {};
    _self.settings.port = settings.port || 3000;
    _self.settings.host = settings.host || "localhost";
    _self.settings.protocol = settings.protocol || (_self.settings.siteUrl.indexOf("https://") !== -1 ? "https" : "http");

    _self.emitUpdatedPath = function(filePath) {
        filePath = filePath
            .replace(path.join(_self.settings.watchBase), _self.settings.siteUrl + "/" + _self.settings.spFolder)
            .replace(/\\/g, "/").replace("://", "")
            .replace(_self.settings.siteUrl.replace("://", "").split("/")[0], "")
            .replace('//','/');
        _self.io.emit('liveReload', filePath);
    };

    _self.getUserCustomActions = function(callback, errCallback) {
        _self.provisioning = _self.provisioning || (function() {
            var Provisioning = require(__dirname + '/utils/provisioning');
            return new Provisioning(_self.settings);
        })();
        _self.provisioning.getUserCustomActions(callback, errCallback);
    };
    _self.provisionMonitoringAction = function(callback, errCallback) {
        _self.provisioning = _self.provisioning || (function() {
            var Provisioning = require(__dirname + '/utils/provisioning');
            return new Provisioning(_self.settings);
        })();
        _self.provisioning.provisionMonitoringAction(callback, errCallback);
    };
    _self.retractMonitoringAction = function(callback, errCallback) {
        _self.provisioning = _self.provisioning || (function() {
            var Provisioning = require(__dirname + '/utils/provisioning');
            return new Provisioning(_self.settings);
        })();
        _self.provisioning.retractMonitoringAction(callback, errCallback);
    };

    // Init live reload server
    _self.runServer = function() {
        var express = require('express');
        var app = express();

        var staticRouter = express.Router();
        staticRouter.get("/*", function(req, res) {
            if (req.url === "/socket.io.js") {
                var staticRoot = path.join(__dirname, "/../../", "/socket.io-client/socket.io.js");
                res.sendFile(staticRoot);
                return;
            } else if (req.url === "/live-reload.client.js") {
                if (typeof _self.liveReloadClientContent === "undefined") {
                    var liveReloadClientPath = path.join(__dirname + "/static/live-reload.client.js");
                    _self.liveReloadClientContent = String(fs.readFileSync(liveReloadClientPath));
                    _self.liveReloadClientContent = _self.liveReloadClientContent.replace(
                        '"##settings#"',
                        JSON.stringify({
                            protocol: _self.settings.protocol,
                            host: _self.settings.host || "localhost",
                            port: _self.settings.port || 3000
                        })
                    );
                }
                res.send(_self.liveReloadClientContent);
                return;
            } else {
                var staticRoot = path.join(__dirname + "/static");
                res.sendFile(path.join(staticRoot, req.url));
                return;
            }
        });
        app.use('/s', staticRouter);

        if (_self.settings.protocol === "https") {
            var options = {
                key: fs.readFileSync(_self.settings.ssl.key),
                cert: fs.readFileSync(_self.settings.ssl.cert)
            };
            var https = require('https');
            var server = https.createServer(options, app);
            _self.io = require('socket.io')(server);
            server.listen(_self.settings.port, _self.settings.host, function() {
                console.log('Live reload server is up and running at %s://%s:%s', _self.settings.protocol, _self.settings.host, _self.settings.port);
                console.log('Make sure that monitoring script (%s://%s:%s/s/live-reload.client.js) is provisioned to SharePoint.', _self.settings.protocol, _self.settings.host, _self.settings.port);
            });
        } else {
            var server = require('http').Server(app);
            _self.io = require('socket.io')(server);
            server.listen(_self.settings.port, _self.settings.host, function() {
                console.log('Live reload server is up and running at %s://%s:%s', _self.settings.protocol, _self.settings.host, _self.settings.port);
                console.log('Make sure that monitoring script (%s://%s:%s/s/live-reload.client.js) is provisioned to SharePoint.', _self.settings.protocol, _self.settings.host, _self.settings.port);
            });
        }
    };

    return _self;
};

module.exports = spf.liveReload;
