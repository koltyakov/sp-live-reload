# sp-live-reload - SharePoint pages live reload module for client side development

[![NPM](https://nodei.co/npm/sp-live-reload.png?mini=true&downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/sp-live-reload/)

[![npm version](https://badge.fury.io/js/sp-live-reload.svg)](https://badge.fury.io/js/sp-live-reload)
[![Downloads](https://img.shields.io/npm/dm/sp-live-reload.svg)](https://www.npmjs.com/package/sp-live-reload)

The module allows arranging live reload capability on SharePoint host pages on frontend assets changing and publishing.

## Supported SharePoint versions:

- SharePoint Online
- SharePoint 2013
- SharePoint 2016

## How to use:

### Install:

```bash
npm install sp-live-reload --save-dev
```

### Demo:

![Live Reload in action](http://koltyakov.ru/images/LiveReloadSimpleDemo.gif)

### Usage withing Gulp task:

#### Watch with live reload

```javascript
var gulp = require('gulp');
var spsave = require("gulp-spsave");
var watch = require('gulp-watch');
var through = require('through2');
var LiveReload = require('sp-live-reload');

var config = require('./gulp.config');

gulp.task("watch-assets", function () {
    console.log("Watch with reload is initiated.");
    console.log("Make sure that monitoring script is provisioned to SharePoint.");
    var liveReload = new LiveReload(config);
    liveReload.runServer();
    return watch(config.watchAssets, function (event) {
        console.log(event.path);
        gulp.src(event.path, {
            base: config.watchBase
        }).pipe(spsave(config.spsaveCoreOptions, config.spsaveCreds))
        .pipe(through.obj(function (chunk, enc, cb) {
            var chunkPath = chunk.path;
            liveReload.emitUpdatedPath(chunkPath);
            cb(null, chunk);
        }));
    });
});
```

### Arguments

- `siteUrl` - SharePoint site (SPWeb) url [string, required]
- `port` - SharePoint site (SPWeb) url [string, optional, default: `3000`]
- `watchBase` - base path from which files in a local project are mapped to remote location [string, required]
- `spFolder` - root folder relative (to `siteUrl`) path in SharePoint mapped to a project [string, required]
- `protocol` - protocol name with possible values: `http` or `https` [string, optional]
- `ssl` - ssl parameters [object, required only on case of `protocol` equal to `https`]
    - `key` - local path to `key.pem` file
    - `cert` - local path to `cert.pem` file
- `creds` - [node-sp-auth](https://github.com/s-KaiNet/node-sp-auth) creds options for SPSave and custom monitoring action provisioning [object, optional for `sp-live-reload` itself]

`creds` and `spsaveCreds` are identical as the modules use the same core authentication module.
`spsaveCoreOptions` can be checked [here](https://github.com/s-KaiNet/spsave#core-options).

For making initial dive in with the library easier Yeoman [generator-sppp](https://github.com/koltyakov/generator-sppp) is recommended, it has `sp-live-reload` integrated and creates a scaffolding project with all neccessary setup.

### HTTPS / SSL

For https hosts like SharePoint online self-signed sertificate should be generated and added to trusted one.

1\. Install openssl

- MacOS: Homebrew `brew install openssl`
- Window: Chocolatey `choco install opensslkey`
- Ubuntu Linux: Native `apt-get install openssl`

2\. Generate keys

```bash
openssl genrsa -out key.pem
```

```bash
openssl req -new -key key.pem -out csr.pem
```

```bash
openssl x509 -req -days 9999 -in csr.pem -signkey key.pem -out cert.pem
rm csr.pem
```

3\. Add cert to trusted

### Installation in SharePoint site collection

Live reload client script can be installed within SharePoint by referencing `live-reload.client.js`.
By default, the path to the client is following: `http://localhost:3000/s/live-reload.client.js`.

```html
<script type="text/javascript" src="http://localhost:3000/s/live-reload.client.js"></script>
```

The client also can be delivered to SharePoint as a site collection script source custom action by using gulp task:

```bash
gulp live-reload-install
```

Source:

```javascript
// ... 

gulp.task("live-reload-install", function () {
    console.log("Installing live reload to site collection.");
    var liveReload = new LiveReload(config);
    liveReload.provisionMonitoringAction(function() {
        console.log("Custom action has been installed");
    }, function(err) {
        console.log(err.message);
    });
});
```

To delete such a custom action another gulp task can be used:

```bash
gulp live-reload-unistall
```

Source:

```javascript
// ... 

gulp.task("live-reload-unistall", function () {
    console.log("Retracting live reload from site collection.");
    var liveReload = new LiveReload(liveReloadConfig);
    liveReload.retractMonitoringAction(function() {
        console.log("Custom action has been retracted");
    }, function(err) {
        console.log(err.message);
    });
});
```