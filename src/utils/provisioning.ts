import * as fs from 'fs';
import * as path from 'path';
import { spsave } from 'spsave';
import * as spauth from 'node-sp-auth';
import * as sprequest from 'sp-request';

import { ILRSettings } from '../interfaces';

export class ReloadProvisioning {

  private ctx: ILRSettings;
  private spr: sprequest.ISPRequest;

  constructor (settings: ILRSettings) {
    this.ctx = {
      ...settings,
      port: typeof settings.port !== 'undefined' ? settings.port : 3000,
      host: typeof settings.host !== 'undefined' ? settings.host : 'localhost',
      protocol: typeof settings.protocol !== 'undefined' ? settings.protocol :
        (settings.siteUrl || '').toLowerCase().indexOf('https://') === 0 ? 'https' : 'http'
    };
    this.spr = this.getCachedRequest();
  }

  public getUserCustomActions (): Promise<any> {
    return new Promise((resolve, reject) => {
      this.spr = this.getCachedRequest();
      this.spr.get(`${this.ctx.siteUrl}/_api/site/usercustomactions`)
        .then((response: any) => {
          resolve(response.body.d.results);
        });
    });
  }

  public getSiteData (): Promise<any> {
    return new Promise((resolve, reject) => {
      this.spr = this.getCachedRequest();
      this.spr.get(`${this.ctx.siteUrl}/_api/site`)
        .then((response: any) => {
          resolve(response.body.d);
        });
    });
  }

  public provisionMonitoringAction (): Promise<any> {
    return new Promise((resolve, reject) => {
      const devBaseUrl = `${this.ctx.protocol}://${this.ctx.host}:${this.ctx.port}`
        .replace(':80', '').replace(':443', '');
      this.getSiteData()
        .then((data) => {
          return this.deployClientScript(data.Url);
        })
        .then(() => {
          return this.getUserCustomActions();
        })
        .then((customActions) => {
          const cas = customActions.filter((ca) => {
            return ca.Title === 'LiveReloadCustomAction';
          });
          if (cas.length === 0) {
            resolve(this.provisionCustomAction());
          } else {
            reject({
              message: 'Warning: Live Reload custom action has already been deployed. Skipped.'
            });
          }
        });
    });
  }

  public retractMonitoringAction (): Promise<any> {
    return this.getUserCustomActions()
      .then((customActions) => {
        customActions.forEach((ca) => {
          if (ca.Title === 'LiveReloadCustomAction') {
            return this.deleteCustomAction(ca.Id);
          }
        });
      });
  }

  private deployClientScript (siteCollectionUrl?: string): Promise<any> {
    let fileContent = String(fs.readFileSync(path.join(__dirname, '/../', '/static/live-reload.client.js')));
    fileContent = fileContent.replace(
      '"##settings#"',
      JSON.stringify({
        protocol: this.ctx.protocol,
        host: this.ctx.host,
        port: this.ctx.port
      })
    );
    const core = {
      siteUrl: siteCollectionUrl || this.ctx.siteUrl,
      flatten: false,
      checkin: true,
      checkinType: 1
    };
    const fileOptions = {
      fileName: 'live-reload.client.js',
      fileContent,
      folder: '_catalogs/masterpage/spf/dev'
    };
    return spsave(core, this.ctx.creds, fileOptions) as any;
  }

  private provisionCustomAction (): Promise<any> {
    this.spr = this.getCachedRequest();
    const reqBody = {
      '__metadata': {
        'type': 'SP.UserCustomAction'
      },
      'Title': 'LiveReloadCustomAction',
      'Location': 'ScriptLink',
      'Description': 'Live Reload Custom Action',
      'ScriptSrc': '~sitecollection/_catalogs/masterpage/spf/dev/live-reload.client.js',
      'Sequence': '10000'
    };

    return this.spr.requestDigest(this.ctx.siteUrl)
      .then((digest) => {
        return this.spr.post(`${this.ctx.siteUrl}/_api/site/usercustomactions`, {
          headers: {
            'X-RequestDigest': digest,
            'Accept': 'application/json; odata=verbose',
            'Content-Type': 'application/json; odata=verbose'
          },
          body: reqBody
        });
      }) as any;
  }

  private deleteCustomAction (customActionId): Promise<any> {
    this.spr = this.getCachedRequest();
    return this.spr.requestDigest(this.ctx.siteUrl)
      .then((digest) => {
        return this.spr.post(`${this.ctx.siteUrl}/_api/site/usercustomactions('${customActionId}')`, {
          headers: {
            'X-RequestDigest': digest,
            'X-HTTP-Method': 'DELETE'
          }
        });
      })
      .then((response) => {
        return response.body;
      }) as any;
  }

  private getAuthOptions (): Promise<spauth.IAuthResponse> {
    return spauth.getAuth(this.ctx.siteUrl, this.ctx.creds) as any;
  }

  private getCachedRequest (): sprequest.ISPRequest {
    return this.spr || sprequest.create(this.ctx.creds);
  }

}
