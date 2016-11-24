var spf = spf || {};

spf.utils = spf.utils || {};
spf.utils.replaceUrlTokens = function (a) {
    var c = window._spPageContextInfo;
    if (a == null || a === "" || c == null) {
        return "";
    }
    var k = "~site/", f = "~sitecollection/", e = "~sitecollectionmasterpagegallery/", b = a.toLowerCase();
    if (b.indexOf(k) === 0) {
        var n = h(c.webServerRelativeUrl);
        a = n + a.substr(k.length);
        b = n + b.substr(k.length);
    } else if (b.indexOf(f) === 0) {
        var m = h(c.siteServerRelativeUrl);
        a = m + a.substr(f.length);
        b = m + b.substr(f.length);
    } else if (b.indexOf(e) === 0) {
        var l = h(c.siteServerRelativeUrl);
        a = l + "_catalogs/masterpage/" + a.substr(e.length);
        b = l + "_catalogs/masterpage/" + b.substr(e.length);
    }
    var j = "{lcid}", i = "{locale}", g = "{siteclienttag}", d = -1;
    while (b.indexOf(j) !== -1) {
        a = a.substring(0, d) + String(c.currentLanguage) + a.substr(d + j.length);
        b = b.replace(j, String(c.currentLanguage));
    }
    while (b.indexOf(i) !== -1) {
        a = a.substring(0, d) + c.currentUICultureName + a.substr(d + i.length);
        b = b.replace(i, c.currentUICultureName);
    }
    while (b.indexOf(g) !== -1) {
        a = a.substring(0, d) + c.siteClientTag + a.substr(d + g.length);
        b = b.replace(g, c.siteClientTag);
    }
    return a;
    function h(a) {
        if (a == null || a === "") {
            return "";
        }
        var b = a.length;
        return a[b - 1] === "/" ? a : a + "/";
    }
};
spf.utils.addFileLink = function (filename, addtype) {
    var addtype = addtype || "vanilla";
    var fileNameParts = filename.split(".");
    var fileExt = fileNameParts[fileNameParts.length - 1];

    if (typeof SPClientTemplates !== "undefined") {
        filename = SPClientTemplates.Utility.ReplaceUrlTokens(filename);
    } else {
        filename = spf.utils.replaceUrlTokens(filename);
    }

    switch (fileExt) {
        case 'css':
            var links = document.querySelectorAll("link[href='" + filename + "']");
            if (links.length === 0) {
                if (addtype === "vanilla") {
                    var fileref = document.createElement("link");
                    fileref.setAttribute("rel", "stylesheet");
                    fileref.setAttribute("type", "text/css");
                    fileref.setAttribute("href", filename);

                    if (typeof fileref !== "undefined") {
                        document.getElementsByTagName("head")[0].appendChild(fileref);
                    }
                } else {
                    document.write('<link rel="stylesheet" type="text/css" href="' + filename + '">');
                }
            }
            break;
        case 'js':
            var links = document.querySelectorAll("script[src='" + filename + "']");
            if (links.length === 0) {
                if (addtype === "vanilla") {
                    var fileref = document.createElement("script");
                    fileref.setAttribute("type", "text/javascript");
                    fileref.setAttribute("src", filename);

                    if (typeof fileref !== "undefined") {
                        document.getElementsByTagName("head")[0].appendChild(fileref);
                    }
                } else {
                    document.write('<script type="text/javascript" src="' + filename + '"></' + 'script>');
                }
            }
            break;
        default:
            if (typeof (console) !== "undefined") {
                console.log('File type is not supported, you can use only ".css" and ".js"');
            }
    }
};
spf.utils.waitForCondition = function(condition, callback, tries, timeout) {
    var timeout = timeout || 200;
    if (typeof tries === "undefined") {
        tries = 50;
    }
    if (!condition()) {
        if (tries > 0) {
            tries -= 1;
            setTimeout(function() {
                spf.utils.waitForCondition(condition, callback, tries);
            }, timeout);
        }
    } else {
        if (callback && typeof callback === "function") {
            callback();
        }
    }
};

spf.liveReloadClient = function(settings) {
    var _self = this;
    var settings = settings || {};

    settings.protocol = settings.protocol || window.location.protocol.replace(":", "");
    settings.host = settings.host || "localhost";
    settings.port = settings.port || 3000;

    var getPageResources = function(callback) {
        var basePath = window.location.protocol + "//" + window.location.hostname;

        var scriptLinks = [];
        var scripts = document.getElementsByTagName("script");
        for (var i = 0, len = scripts.length; i < len; i += 1) {
            if (scripts[i].src.length > 0) {
                scriptLinks.push(scripts[i].src.replace(basePath, "").split("?")[0].toLowerCase());
            }
        }

        var stylesLinks = [];
        var styles = document.getElementsByTagName("link");
        for (var i = 0, len = styles.length; i < len; i += 1) {
            if (styles[i].href.length > 0) {
                stylesLinks.push(styles[i].href.replace(basePath, "").split("?")[0].toLowerCase());
            }
        }
        if (typeof _self.contentLinks === "undefined") {
            ExecuteOrDelayUntilScriptLoaded(function() {
                var clientContext = new SP.ClientContext(_spPageContextInfo.webServerRelativeUrl);
                var oWeb = clientContext.get_web();
                var oList = oWeb.get_lists().getById(_spPageContextInfo.pageListId);
                var oPageItem = null;
                var oFile = oWeb.getFileByServerRelativeUrl(window.location.pathname);
                var limitedWebPartManager = oFile.getLimitedWebPartManager(SP.WebParts.PersonalizationScope.shared);
                var collWebPart = limitedWebPartManager.get_webParts();
                if (_spPageContextInfo.pageItemId) {
                    oPageItem = oList.getItemById(_spPageContextInfo.pageItemId);
                    clientContext.load(oPageItem);
                }
                clientContext.load(collWebPart, 'Include(WebPart.Properties)');
                clientContext.executeQueryAsync(
                    function () {
                        var webPartsDef = collWebPart.get_data();
                        var contentLinks = [];
                        webPartsDef.forEach(function(wpd) {
                            var contentLink = wpd.get_webPart().get_properties().get_fieldValues()["ContentLink"];
                            if (typeof contentLink !== "undefined") {
                                contentLinks.push(contentLink.toLowerCase());
                            }
                        });

                        // Masterpage
                        var masterPageUrl = web.get_masterUrl().toLowerCase();
                        contentLinks.push(masterPageUrl);

                        // Publishing page layout
                        if (_spPageContextInfo.pageItemId) {
                            var layoutUrl = oPageItem.get_fieldValues()["PublishingPageLayout"];
                            if (typeof layoutUrl !== "undefined") {
                                layoutUrl = layoutUrl.get_url();
                                layoutUrl = "/_catalogs" + layoutUrl.split("/_catalogs")[1];
                                contentLinks.push(masterPageUrl);
                            }
                        }

                        _self.contentLinks = contentLinks;
                        if (callback && typeof callback === "function") {
                            callback([].concat(contentLinks, scriptLinks, stylesLinks));
                        }
                    },
                    function(sender, args) {
                        console.log('Error: ' + args.get_message() + ' ' + args.get_stackTrace());
                    }
                );
            }, "sp.js");
        } else {
            if (callback && typeof callback === "function") {
                callback([].concat(_self.contentLinks, scriptLinks, stylesLinks));
            }
        }
    };

    var devBaseUrl = settings.protocol + '://' + settings.host + ':' + settings.port;

    var init = function() {
        spf.utils.addFileLink(devBaseUrl + '/s/socket.io.js');
        spf.utils.waitForCondition(function() {
            return typeof io !== "undefined";
        }, function() {
            var socket = io.connect(devBaseUrl);
            socket.on('liveReload', function (data) {
                data = (data || "").toLowerCase();
                getPageResources(function(pageRes) {
                    if (pageRes.indexOf(data) !== -1) {
                        if (data.indexOf(".css") !== -1) {
                            var styles = document.getElementsByTagName("link");
                            for (var i = 0, len = styles.length; i < len; i += 1) {
                                if (styles[i].href.length > 0) {
                                    if (styles[i].href.indexOf(data) !== -1) {
                                        styles[i].href = data + "?d=" + (new Date()).getTime();
                                    }
                                }
                            }
                        } else {
                            window.location.reload();
                        }
                    }
                });
            });
            socket.on('connect_error', function () {
                _self.socketConnectionTries = (_self.socketConnectionTries || 0) + 1;
                if (_self.socketConnectionTries >= 25) {
                    socket.destroy();
                }
            });
        }, 5);
    };

    init();
};

ExecuteOrDelayUntilScriptLoaded(function() {
    var settings = "##settings#"; // Is generated automatically
    if (typeof settings === "string") {
        settings = {};
    }
    new spf.liveReloadClient(settings);
}, "sp.js");