import * as socketIOClient from 'socket.io-client';

import { ILRClientSettings } from './interfaces';

export class LiveReloadClient {

  private settings: ILRClientSettings;
  private pageResources: string[];
  private devBaseUrl: string;
  private webUrl: string;

  private fetchOptions: RequestInit = {
    method: 'GET',
    credentials: 'same-origin',
    headers: {
      accept: 'application/json;odata=verbose'
    }
  };

  constructor (settings: ILRClientSettings) {
    this.settings = {
      ...settings,
      protocol: settings.protocol || location.protocol.replace(':', ''),
      host: settings.host || 'localhost',
      port: settings.port || 3000
    };

    this.devBaseUrl = `${this.settings.protocol}://${this.settings.host}:${this.settings.port}`
      .replace(':80', '').replace(':443', '');

    this.webUrl = (_spPageContextInfo.webServerRelativeUrl + '/').replace(/\/\//g, '/');
  }

  public init = (): void => {
    const socket = socketIOClient.connect(this.devBaseUrl, {
      reconnectionDelay: 1000,
      reconnection: true,
      reconnectionAttempts: 25,
      transports: ['websocket'],
      agent: false,
      upgrade: false,
      rejectUnauthorized: false
    });

    this.getPageResources().then(res => {
      this.pageResources = res;
    });

    socket.on('live_reload', (data: string) => {
      data = (data || '').split('?')[0].toLowerCase();
      if (this.pageResources.indexOf(data) !== -1) {
        if (data.indexOf('.css') !== -1) {
          const styles: HTMLLinkElement[] = Array.prototype.slice.call(document.getElementsByTagName('link'));
          styles
            .filter(s => s.href.length > 0)
            .forEach(s => {
              if (s.href.toLowerCase().indexOf(data) !== -1) {
                s.href = `${data}?d=${(new Date()).getTime()}`;
              }
            });
        } else {
          window.location.reload();
        }
      }
    });

    socket.on('reconnect_attempt', () => {
      socket.io.opts.transports = ['polling', 'websocket'];
    });
  }

  private getPageResources = async (): Promise<string[]> => {
    let contentLinks: string[] = [];
    let endpoint: string;
    const basePath: string = `${window.location.protocol}//${window.location.hostname}`;

    // JavaScripts
    const scripts: HTMLScriptElement[] = Array.prototype.slice.call(document.getElementsByTagName('script'));
    contentLinks = contentLinks.concat(
      scripts
        .filter(s => s.src.length > 0)
        .map(s => {
          return decodeURIComponent(s.src.replace(basePath, '').split('?')[0].toLowerCase());
        })
    );

    // CSS Styles
    const styles: HTMLLinkElement[] = Array.prototype.slice.call(document.getElementsByTagName('link'));
    contentLinks = contentLinks.concat(
      styles
        .filter(s => s.href.length > 0)
        .map(s => {
          return decodeURIComponent(s.href.replace(basePath, '').split('?')[0].toLowerCase());
        })
    );

    // Masterpage URL
    endpoint = `${this.webUrl}_api/web?$select=MasterUrl`;
    await fetch(endpoint, this.fetchOptions)
      .then(r => r.json())
      .then(({ d: res }) => {
        contentLinks.push(res.MasterUrl.split('?')[0].toLowerCase());
      });

    // Layout URL
    if (_spPageContextInfo && _spPageContextInfo.pageListId && _spPageContextInfo.pageItemId) {
      endpoint = `${this.webUrl}_api/web/lists('${_spPageContextInfo.pageListId}')/items(${_spPageContextInfo.pageItemId})`;
      await fetch(endpoint, this.fetchOptions)
        .then(r => r.json())
        .then(({ d: res }) => {
          if (res.PublishingPageLayout) {
            let layoutUrl: string = res.PublishingPageLayout.Url;
            layoutUrl = '/_catalogs' + layoutUrl.split('/_catalogs')[1];
            layoutUrl = layoutUrl.split('?')[0].toLowerCase();
            contentLinks.push(decodeURIComponent(layoutUrl));
          }
        });
    }

    // Webparts sources
    endpoint = `${this.webUrl}_api/web/getFileByServerRelativeUrl('${location.pathname}')/` +
      `getLimitedWebPartManager(scope=1)/webparts?$select=WebPart/Properties/ContentLink&$expand=WebPart/Properties`;
    contentLinks = contentLinks.concat(
      (
        await fetch(endpoint, this.fetchOptions)
          .then(r => r.json())
          .then(({ d }) => d.results)
      )
        .filter(w => w.WebPart.Properties.ContentLink)
        .map(w => {
          return w.WebPart.Properties.ContentLink.split('?')[0].toLowerCase();
        })
    );

    return contentLinks;
  }
}

ExecuteOrDelayUntilBodyLoaded(() => {
  let settings: any = '##settings#'; // Is generated automatically
  if (typeof settings === 'string') {
    settings = {};
  }
  new LiveReloadClient(settings).init();
});
