declare const window: any;
declare const ExecuteOrDelayUntilScriptLoaded: any;
declare const document: any;
declare const SPClientTemplates: any;
declare const SP: any;
declare const _spPageContextInfo: any;
declare const io: any;

interface ILRClientSettings {
  protocol?: string;
  host?: string;
  port?: number;
}

namespace spf.utils {

  export const replaceUrlTokens = (a: string): string => {
    let c = window._spPageContextInfo;
    if (a == null || a === '' || c == null) {
      return '';
    }
    let [ k, f, e, b ] = [ '~site/', '~sitecollection/', '~sitecollectionmasterpagegallery/', a.toLowerCase() ];
    if (b.indexOf(k) === 0) {
      let n = h(c.webServerRelativeUrl);
      a = n + a.substr(k.length);
      b = n + b.substr(k.length);
    } else if (b.indexOf(f) === 0) {
      let m = h(c.siteServerRelativeUrl);
      a = m + a.substr(f.length);
      b = m + b.substr(f.length);
    } else if (b.indexOf(e) === 0) {
      let l = h(c.siteServerRelativeUrl);
      a = l + '_catalogs/masterpage/' + a.substr(e.length);
      b = l + '_catalogs/masterpage/' + b.substr(e.length);
    }
    let [ j, i, g, d ] = [ '{lcid}', '{locale}', '{siteclienttag}', -1 ];
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
    // tslint:disable-next-line:no-shadowed-variable
    function h (a: string) {
      if (a === null || a === '') {
        return '';
      }
      // tslint:disable-next-line:no-shadowed-variable
      let b: number = a.length;
      return a[b - 1] === '/' ? a : a + '/';
    }
  };

  export const addFileLink = (filename: string, addtype: 'vanilla' | 'inline' = 'vanilla'): void => {
    let fileNameParts = filename.split('.');
    let fileExt = fileNameParts[fileNameParts.length - 1].split('?')[0];
    let links: any[];

    if (typeof SPClientTemplates !== 'undefined') {
      filename = SPClientTemplates.Utility.ReplaceUrlTokens(filename);
    } else {
      filename = spf.utils.replaceUrlTokens(filename);
    }

    switch (fileExt) {
      case 'css':
        links = document.querySelectorAll(`link[href='${filename}']`);
        if (links.length === 0) {
          if (addtype === 'vanilla') {
            let fileref = document.createElement('link');
            fileref.setAttribute('rel', 'stylesheet');
            fileref.setAttribute('type', 'text/css');
            fileref.setAttribute('href', filename);

            if (typeof fileref !== 'undefined') {
              document.getElementsByTagName('head')[0].appendChild(fileref);
            }
          } else {
            document.write(`<link rel="stylesheet" type="text/css" href="${filename}">`);
          }
        }
        break;
      case 'js':
        links = document.querySelectorAll(`script[src='${filename}']`);
        if (links.length === 0) {
          if (addtype === 'vanilla') {
            let fileref = document.createElement('script');
            fileref.setAttribute('type', 'text/javascript');
            fileref.setAttribute('src', filename);

            if (typeof fileref !== 'undefined') {
              document.getElementsByTagName('head')[0].appendChild(fileref);
            }
          } else {
            document.write(`<script type="text/javascript" src="${filename}"></` + `script>`);
          }
        }
        break;
      default:
        if (typeof console !== 'undefined') {
          console.log('File type is not supported, you can use only ".css" and ".js"');
        }
    }
  };

  export const waitForCondition = (condition: Function, callback: Function, tries: number = 50, timeout: number = 200) => {
    if (!condition()) {
      if (tries > 0) {
        tries -= 1;
        setTimeout(() => {
          spf.utils.waitForCondition(condition, callback, tries);
        }, timeout);
      }
    } else {
      if (callback && typeof callback === 'function') {
        callback();
      }
    }
  };

}

class LiveReloadClient {

  private settings: ILRClientSettings;
  private devBaseUrl: string;
  private contentLinks: string[];

  constructor (settings: ILRClientSettings) {
    this.settings = {
      ...settings,
      protocol: settings.protocol || window.location.protocol.replace(':', ''),
      host: settings.host || 'localhost',
      port: settings.port || 3000
    };
    this.devBaseUrl = `${this.settings.protocol}://${this.settings.host}:${this.settings.port}`.replace(':80', '').replace(':443', '');
  }

  public init () {
    spf.utils.addFileLink(`${this.devBaseUrl}/s/socket.io.js`);
    spf.utils.waitForCondition(() => {
      return typeof io !== 'undefined';
    }, () => {
      let socket = io.connect(this.devBaseUrl);
      socket.on('liveReload', (data: any) => {
        data = (data || '').toLowerCase();
        this.getPageResources((pageRes: string) => {
          if (pageRes.indexOf(data) !== -1) {
            if (data.indexOf('.css') !== -1) {
              let styles: any[] = Array.prototype.slice.call(document.getElementsByTagName('link'));
              styles.forEach((style: any) => {
                if (style.href.length > 0) {
                  if (style.href.indexOf(data) !== -1) {
                    style.href = `${data}?d=${(new Date()).getTime()}`;
                  }
                }
              });
            } else {
              window.location.reload();
            }
          }
        });
      });
      socket.on('connect_error', function () {
        this.socketConnectionTries = (this.socketConnectionTries || 0) + 1;
        if (this.socketConnectionTries >= 25) {
          socket.destroy();
        }
      });
    }, 5);
  }

  private getPageResources (callback) {
    let basePath: string = `${window.location.protocol}//${window.location.hostname}`;

    let scriptLinks: string[] = [];
    let scripts: any[] = Array.prototype.slice.call(document.getElementsByTagName('script'));
    scripts.forEach((script: any) => {
      if (script.src.length > 0) {
        scriptLinks.push(decodeURIComponent(script.src.replace(basePath, '').split('?')[0].toLowerCase()));
      }
    });

    let stylesLinks: string[] = [];
    let styles: any[] = Array.prototype.slice.call(document.getElementsByTagName('link'));
    styles.forEach((style: any) => {
      if (style.href.length > 0) {
        stylesLinks.push(style.href.replace(basePath, '').split('?')[0].toLowerCase());
      }
    });

    if (typeof this.contentLinks === 'undefined') {
      ExecuteOrDelayUntilScriptLoaded(function () {
        let clientContext = new SP.ClientContext(_spPageContextInfo.webServerRelativeUrl);
        let oWeb = clientContext.get_web();
        let oList = oWeb.get_lists().getById(_spPageContextInfo.pageListId);
        let oPageItem = null;
        let oFile = oWeb.getFileByServerRelativeUrl(window.location.pathname);
        let limitedWebPartManager = oFile.getLimitedWebPartManager(SP.WebParts.PersonalizationScope.shared);
        let collWebPart = limitedWebPartManager.get_webParts();
        if (_spPageContextInfo.pageItemId) {
          oPageItem = oList.getItemById(_spPageContextInfo.pageItemId);
          clientContext.load(oPageItem);
        }
        clientContext.load(oWeb);
        clientContext.load(collWebPart, 'Include(WebPart.Properties)');
        clientContext.executeQueryAsync(
          () => {
            let webPartsDef = collWebPart.get_data();
            let contentLinks = [];
            webPartsDef.forEach(function (wpd) {
              let contentLink = wpd.get_webPart().get_properties().get_fieldValues().ContentLink;
              if (typeof contentLink !== 'undefined') {
                contentLinks.push(decodeURIComponent(contentLink.toLowerCase()));
              }
            });

            // Masterpage
            let masterPageUrl = oWeb.get_masterUrl().toLowerCase();
            contentLinks.push(masterPageUrl);

            // Publishing page layout
            if (_spPageContextInfo.pageItemId) {
              let layoutUrl = oPageItem.get_fieldValues().PublishingPageLayout;
              if (typeof layoutUrl !== 'undefined') {
                layoutUrl = layoutUrl.get_url();
                layoutUrl = '/_catalogs' + layoutUrl.split('/_catalogs')[1];
                layoutUrl = layoutUrl.toLowerCase();
                contentLinks.push(decodeURIComponent(layoutUrl));
              }
            }

            this.contentLinks = contentLinks;
            if (callback && typeof callback === 'function') {
              callback([].concat(contentLinks, scriptLinks, stylesLinks));
            }
          },
          (sender, args) => {
            console.log(`Error: ${args.get_message()} ${args.get_stackTrace()}`);
          }
        );
      }, 'sp.js');
    } else {
      if (callback && typeof callback === 'function') {
        callback([].concat(this.contentLinks, scriptLinks, stylesLinks));
      }
    }
  }

}

ExecuteOrDelayUntilScriptLoaded(() => {
  let settings: any = '##settings#'; // Is generated automatically
  if (typeof settings === 'string') {
    settings = {};
  }
  (new LiveReloadClient(settings)).init();
}, 'sp.js');
