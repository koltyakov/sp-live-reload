const gulp = require('gulp');
const spsave = require("gulp-spsave");
const watch = require('gulp-watch');
const through = require('through2');
const path = require('path');
const AuthConfig = require('node-sp-auth-config').AuthConfig;

const LiveReload = require('../dist');

const authConfig = new AuthConfig({
  configPath: path.resolve('../config/private.json'),
  encryptPassword: true,
  saveConfigOnDisk: true
});

gulp.task("test-watch", () => {
  console.log("Watch with reload is initiated.");
  console.log("Make sure that monitoring script is provisioned to SharePoint.");

  authConfig.getContext()
    .then(context => {
      const watchBase = 'assets';
      const spFolder = '_catalogs/masterpage/spf/assets';
      let liveReloadOptions = {
        siteUrl: context.siteUrl,
        creds: context.authOptions,
        watchBase: watchBase,
        spFolder: spFolder
      };
      let spSaveCoreOptions = {
        siteUrl: context.siteUrl,
        folder: spFolder,
        flatten: false,
        checkin: true,
        checkinType: 1
      };
      const liveReload = new LiveReload(liveReloadOptions);
      liveReload.runServer();
      return watch(`${watchBase}/**/*.*`, (event) => {
        console.log(event.path);
        gulp
          .src(event.path, {
            base: watchBase
          })
          .pipe(spsave(spSaveCoreOptions, context.authOptions))
          .pipe(through.obj((chunk, enc, cb) => {
            var chunkPath = chunk.path;
            console.log('emitted:', chunkPath);
            liveReload.emitUpdatedPath(chunkPath);
            cb(null, chunk);
          }));
      });
    })
    .catch(error => {
      console.log(error);
    });

});
