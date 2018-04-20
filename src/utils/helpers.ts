export default class Helpers {

  public static replaceUrlTokens = (a: string): string => {
    const c = _spPageContextInfo;
    if (a == null || a === '' || c == null) {
      return '';
    }
    let [ k, f, e, b ] = [ '~site/', '~sitecollection/', '~sitecollectionmasterpagegallery/', a.toLowerCase() ];
    if (b.indexOf(k) === 0) {
      const n = h(c.webServerRelativeUrl);
      a = n + a.substr(k.length);
      b = n + b.substr(k.length);
    } else if (b.indexOf(f) === 0) {
      const m = h(c.siteServerRelativeUrl);
      a = m + a.substr(f.length);
      b = m + b.substr(f.length);
    } else if (b.indexOf(e) === 0) {
      const l = h(c.siteServerRelativeUrl);
      a = l + '_catalogs/masterpage/' + a.substr(e.length);
      b = l + '_catalogs/masterpage/' + b.substr(e.length);
    }
    const [ j, i, g, d ] = [ '{lcid}', '{locale}', '{siteclienttag}', -1 ];
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
      const b: number = a.length;
      return a[b - 1] === '/' ? a : a + '/';
    }
  }

  public static addFileLink = (filename: string, addtype: 'vanilla' | 'inline' = 'vanilla'): void => {
    const fileNameParts = filename.split('.');
    const fileExt = fileNameParts[fileNameParts.length - 1].split('?')[0];
    let links: any[];

    if (typeof SPClientTemplates !== 'undefined') {
      filename = SPClientTemplates.Utility.ReplaceUrlTokens(filename);
    } else {
      filename = Helpers.replaceUrlTokens(filename);
    }

    switch (fileExt) {
      case 'css':
        links = document.querySelectorAll(`link[href='${filename}']`) as any;
        if (links.length === 0) {
          if (addtype === 'vanilla') {
            const fileref = document.createElement('link');
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
        links = document.querySelectorAll(`script[src='${filename}']`) as any;
        if (links.length === 0) {
          if (addtype === 'vanilla') {
            const fileref = document.createElement('script');
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
  }

  public static waitForCondition = (condition: Function, callback: Function, tries: number = 50, timeout: number = 200) => {
    if (!condition()) {
      if (tries > 0) {
        tries -= 1;
        setTimeout(() => {
          Helpers.waitForCondition(condition, callback, tries);
        }, timeout);
      }
    } else {
      if (callback && typeof callback === 'function') {
        callback();
      }
    }
  }

}
