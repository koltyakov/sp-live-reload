# sp-live-reload - SharePoint pages live reload module for client side development

[![NPM](https://nodei.co/npm/sp-live-reload.png?mini=true&downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/sp-live-reload/)

[![npm version](https://badge.fury.io/js/sp-live-reload.svg)](https://badge.fury.io/js/sp-live-reload)
[![Downloads](https://img.shields.io/npm/dm/sp-live-reload.svg)](https://www.npmjs.com/package/sp-live-reload)

---
### Need help on SharePoint with Node.js? Join our gitter chat and ask question! [![Gitter chat](https://badges.gitter.im/gitterHQ/gitter.png)](https://gitter.im/sharepoint-node/Lobby)
---

The module allows arranging live reload capability on SharePoint host pages on frontend assets changing and publishing.

## Supported SharePoint versions

- SharePoint Online
- SharePoint 2013
- SharePoint 2016

## How to use

### Install

```bash
npm install sp-live-reload --save-dev
```

### Demo

![Live Reload in action](http://koltyakov.ru/images/LiveReloadSimpleDemo.gif)

### Usage withing Gulp task

#### Watch with live reload (SPSave)

```javascript
const gulp = require('gulp');
const spsave = require("gulp-spsave");
const watch = require('gulp-watch');
const through = require('through2');
const LiveReload = require('sp-live-reload');

let config = require('./config');

gulp.task("watch-assets", function () {
    console.log("Watch with reload is initiated.");
    console.log("Make sure that monitoring script is provisioned to SharePoint.");
    const liveReload = new LiveReload(config);
    liveReload.runServer();
    return watch(config.watchAssets, (event) => {
        console.log(event.path);
        gulp
            .src(event.path, { base: config.watchBase })
            .pipe(spsave(config.spSaveCoreOptions, config.spSaveCreds))
            .pipe(through.obj((chunk, enc, cb) => {
                let chunkPath = chunk.path;
                liveReload.emitUpdatedPath(chunkPath);
                cb(null, chunk);
            }));
    });
});
```

#### Watch with live reload (Gulp-SPSync)

For those, who for some reasons prefer [gulp-spsync](https://github.com/wictorwilen/gulp-spsync) or [gulp-spsync-creds](https://github.com/estruyf/gulp-spsync-creds) over `spsave`, the following structure is applicable:

```javascript
const gulp = require('gulp');
const spsync = require("gulp-spsync");
const watch = require('gulp-watch');
const through = require('through2');
const LiveReload = require('sp-live-reload');

let config = require('./config');

gulp.task("watch-live", function () {
    console.log("Watch with reload is initiated");
    const liveReload = new LiveReload(config.liveReload);
    liveReload.runServer();
    return watch(config.watchAssets, (event) => {
        console.log(event.path);
        gulp
            .src(event.path, { base: config.watchBase })
            .pipe(spsync(spSyncSettings))
            .pipe(through.obj((chunk, enc, cb) => {
                let chunkPath = chunk.path;
                liveReload.emitUpdatedPath(chunkPath);
                cb(null, chunk);
            }));
    });
});
```

> `gulp-spsync` has different idiology for the paths. In case of it `spFolder` in settings always should be equal to "".

### Arguments

- `siteUrl` - SharePoint site (SPWeb) url [string, required]
- `watchBase` - base path from which files in a local project are mapped to remote location [string, required]
- `spFolder` - root folder relative (to `siteUrl`) path in SharePoint mapped to a project [string, required]

- `creds` - [node-sp-auth](https://github.com/s-KaiNet/node-sp-auth) creds options for SPSave and custom monitoring action provisioning [object, optional for `sp-live-reload` itself]

- `protocol` - protocol name with possible values: `http` or `https` [string, optional]
- `host` - host name or ip, where the live reload server will be running [string, optional, default: `localhost`]
- `port` - SharePoint site (SPWeb) url [string, optional, default: `3000`]
- `ssl` - ssl parameters [object, required only on case of `protocol` equal to `https`]
    - `key` - local path to `key.pem` file
    - `cert` - local path to `cert.crt` file

`creds` and `spSaveCreds` are identical as the modules use the same core authentication module.
`spSaveCoreOptions` can be checked [here](https://github.com/s-KaiNet/spsave#core-options).

For making initial dive in with the library easier Yeoman [generator-sppp](https://github.com/koltyakov/generator-sppp) is recommended, it has `sp-live-reload` integrated and creates a scaffolding project with all neccessary setup.

[`node-sp-auth-config`](https://github.com/koltyakov/node-sp-auth-config) is recommended for building SPSave credential options.
See for the [example](https://github.com/koltyakov/sp-live-reload/blob/master/test/gulpfile.js).

### CDN scenario

In case of publishing scripts to a CDN (to the different [from SharePoint] domain) raw path should be passed to `emitUpdatePath` method:

```javascript
...
liveReload.emitUpdatedPath(rawPath, true);
...
```

Second parameter equal `true`, tells emitter to prevent the path value from any local transformation.

By default, the path is transformed from the local one (`D:\Projects\ProjectName\src\folder\you_file_path.ext`) to a relative SharePoint path (`/sites/collection/subweb/_catalogs/masterpage/folder/you_file_path.ext`).
Where `watchBase` = ``D:\Projects\ProjectName\src`, `siteUrl` = `https://sphost/sites/collection/subweb` and `spFolder` = `_catalogs/masterpage`.

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
openssl x509 -req -days 9999 -in csr.pem -signkey key.pem -out cert.crt
rm csr.pem
```

3\. Add cert to trusted

Depending on your client OS, add `cert.crt` to Trusted root certificates.

- Install certificate
- Local computer
- Trusted root certificates

[Manual for Windows](https://blogs.technet.microsoft.com/sbs/2008/05/08/installing-a-self-signed-certificate-as-a-trusted-root-ca-in-windows-vista/).

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
    liveReload.provisionMonitoringAction()
        .then(() => {
            console.log("Custom action has been installed");
        })
        .catch((err) => {
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
    liveReload.retractMonitoringAction()
        .then(() => {
            console.log("Custom action has been retracted");
        })
        .catch((err) => {
            console.log(err.message);
        });
});
```

### Usage scenarious

#### General

Live reload feature during active development stage on DEV environment.
The manual monitoring script encapsulation is recommended on a specific page while the process of coding and debugging.

#### Device-specific

There are cases then a page/view should be running on a specific device, let's say iPad and Safari.
For sure, an emulator can be used. But sometimes only the real device can show a behavior.
Live reload with shared monitoring server can provide instantaneous reloading feature on a device.