'use strict';

import { sp } from '@pnp/sp';
import { connect as io } from 'socket.io-client';

import Helpers from './utils/helpers';
import { ILRClientSettings } from './interfaces';

export class LiveReloadClient {

  private settings: ILRClientSettings;
  private devBaseUrl: string;
  private contentLinks: string[];
  private socketConnectionTries: number;

  constructor (settings: ILRClientSettings) {
    this.settings = {
      ...settings,
      protocol: settings.protocol || location.protocol.replace(':', ''),
      host: settings.host || 'localhost',
      port: settings.port || 3000
    };
    this.devBaseUrl = `${this.settings.protocol}://${this.settings.host}:${this.settings.port}`
      .replace(':80', '').replace(':443', '');
  }

  public init = (): void => {
    // Helpers.addFileLink(`${this.devBaseUrl}/s/socket.io.js`);
    Helpers.waitForCondition(() => {
      return typeof io !== 'undefined';
    }, () => {
      const socket = io(this.devBaseUrl);
      socket.on('liveReload', (data: string) => {
        data = (data || '').split('?')[0].toLowerCase();
        this.getPageResources().then((pageRes: string[]) => {
          if (pageRes.indexOf(data) !== -1) {
            if (data.indexOf('.css') !== -1) {
              const styles: HTMLLinkElement[] = Array.prototype.slice.call(document.getElementsByTagName('link'));
              styles.forEach((style: HTMLLinkElement) => {
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
      socket.on('connect_error', () => {
        this.socketConnectionTries = (this.socketConnectionTries || 0) + 1;
        if (this.socketConnectionTries >= 25) {
          socket.disconnect();
        }
      });
    }, 5);
  }

  private getPageResources = (): Promise<string[]> => {
    return new Promise(async (resolve, reject) => {

      const basePath: string = `${window.location.protocol}//${window.location.hostname}`;

      const scriptLinks: string[] = [];
      const scripts: any[] = Array.prototype.slice.call(document.getElementsByTagName('script'));
      scripts.forEach((script: any) => {
        if (script.src.length > 0) {
          scriptLinks.push(
            decodeURIComponent(
              script.src.replace(basePath, '')
                .split('?')[0].toLowerCase()
            )
          );
        }
      });

      const stylesLinks: string[] = [];
      const styles: any[] = Array.prototype.slice.call(document.getElementsByTagName('link'));
      styles.forEach((style: any) => {
        if (style.href.length > 0) {
          stylesLinks.push(
            style.href.replace(basePath, '')
              .split('?')[0].toLowerCase()
          );
        }
      });

      let contentLinks = [];

      if (typeof this.contentLinks === 'undefined') {

        // Masterpage URL
        const { MasterUrl } = await sp.web.select('MasterUrl').get();
        contentLinks.push(MasterUrl.split('?')[0].toLowerCase());

        // Layout URL
        if (_spPageContextInfo) {
          if (_spPageContextInfo.pageListId && _spPageContextInfo.pageItemId) {
            const { PublishingPageLayout } = await sp.web.lists
              .getById(_spPageContextInfo.pageListId).items
              .getById(_spPageContextInfo.pageItemId)
              .select('PublishingPageLayout').get();

            let layoutUrl: string = PublishingPageLayout.Url;
            layoutUrl = '/_catalogs' + layoutUrl.split('/_catalogs')[1];
            layoutUrl = layoutUrl.split('?')[0].toLowerCase();
            contentLinks.push(decodeURIComponent(layoutUrl));
          }
        }

        // Webparts sources
        const webParts = (await sp.web
          .getFileByServerRelativeUrl(location.pathname)
          .getLimitedWebPartManager().webparts
          .select('WebPart/Properties/ContentLink')
          .expand('WebPart/Properties').get())
          .filter(w => w.WebPart.Properties.ContentLink)
          .map(w => {
            return w.WebPart.Properties.ContentLink
              .split('?')[0].toLowerCase();
          });
        contentLinks = contentLinks.concat(webParts);

      }

      resolve([].concat(contentLinks, scriptLinks, stylesLinks));

    });
  }

}

(() => {
  let settings: any = '##settings#'; // Is generated automatically
  if (typeof settings === 'string') {
    settings = {};
  }
  new LiveReloadClient(settings).init();
})();
