import * as fs from 'fs';
import * as path from 'path';
import * as Promise from 'bluebird';
import { spsave } from 'spsave';
import * as spauth from 'node-sp-auth';
import * as request from 'request-promise';
import * as sprequest from 'sp-request';

import { ILRSettings } from '../interfaces';

export default class ReloadProvisioning {

    private ctx: ILRSettings;
    private spr: sprequest.ISPRequest;

    constructor(settings: ILRSettings) {
        this.ctx = {
            ...settings,
            port: settings.port || 3000,
            host: settings.host || 'localhost',
            protocol: settings.protocol || settings.siteUrl.indexOf('https://') !== -1 ? 'https' : 'http'
        };
        this.spr = this.getCachedRequest(this.spr);
    }

    public getSiteUserCustomActions(): Promise<any> {
        return new Promise((resolve, reject) => {
            this.spr = this.getCachedRequest(this.spr);
            this.spr.get(`${this.ctx.siteUrl}/_api/site/usercustomactions`)
                .then((response: any) => {
                    resolve(response.body.d.results);
                });
        });
    }

    public getSiteData(): Promise<any> {
        return new Promise((resolve, reject) => {
            this.spr = this.getCachedRequest(this.spr);
            this.spr.get(`${this.ctx.siteUrl}/_api/site`)
                .then((response: any) => {
                    resolve(response.body.d);
                });
        });
        // ServerRelativeUrl, Url
    }

    public provisionMonitoringAction(): Promise<any> {
        return new Promise((resolve, reject) => {
            let devBaseUrl = `${this.ctx.protocol}://${this.ctx.host}:${this.ctx.port}`.replace(':80', '').replace(':443', '');
            this.getSiteData()
                .then((data) => {
                    return this.deployClientScript(data.Url);
                })
                .then(() => {
                    return this.getSiteUserCustomActions();
                })
                .then((customActions) => {
                    let cas = customActions.filter(function(ca) {
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

    public retractMonitoringAction(): Promise<any> {
        return this.getSiteUserCustomActions()
            .then((customActions) => {
                customActions.forEach((ca) => {
                    if (ca.Title === 'LiveReloadCustomAction') {
                        return this.deleteCustomAction(ca.Id);
                    }
                });
            });
    }

    private deployClientScript(siteCollectionUrl?: string): Promise<any> {
        let fileContent = String(fs.readFileSync(path.join(__dirname, '/../', '/static/live-reload.client.js')));
        fileContent = fileContent.replace(
            '"##settings#"',
            JSON.stringify({
                protocol: this.ctx.protocol,
                host: this.ctx.host,
                port: this.ctx.port
            })
        );
        let core = {
            siteUrl: siteCollectionUrl || this.ctx.siteUrl,
            flatten: false,
            checkin: true,
            checkinType: 1
        };
        let fileOptions = {
            fileName: 'live-reload.client.js',
            fileContent: fileContent,
            folder: '_catalogs/masterpage/spf/dev'
        };
        return spsave(core, this.ctx.creds, fileOptions);
    }

    private provisionCustomAction(): Promise<any> {
        this.spr = this.getCachedRequest(this.spr);
        let reqBody = {
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
            });
    }

    private deleteCustomAction(customActionId): Promise<any> {
        this.spr = this.getCachedRequest(this.spr);
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
            });
    }

    private getAuthOptions(): Promise<spauth.IAuthResponse> {
        return spauth.getAuth(this.ctx.siteUrl, this.ctx.creds);
    }

    private getCachedRequest(spr): sprequest.ISPRequest {
        this.spr = this.spr || sprequest.create(this.ctx.creds);
        return spr;
    }

}
