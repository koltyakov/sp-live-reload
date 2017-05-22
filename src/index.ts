import * as fs from 'fs';
import * as path from 'path';
import * as Promise from 'bluebird';
import * as express from 'express';

import Provisioning from './utils/provisioning';
import { ILRSettings, ISSLConf } from './interfaces';

class LiveReload {

    public settings: ILRSettings;
    private provisioning: any;
    private io: any;
    private liveReloadClientContent: string;

    constructor(settings: ILRSettings) {
        this.settings = {
            ...settings,
            port: settings.port || 3000,
            host: settings.host || 'localhost',
            protocol: settings.protocol || (settings.siteUrl.indexOf('https://') !== -1 ? 'https' : 'http')
        };
        this.provisioning = new Provisioning(this.settings);
    }

    // Triggers file update emition to the client
    public emitUpdatedPath(filePath: string, raw: boolean = false) {
        if (!raw) {
            let spRelUrl: string = `${this.settings.siteUrl}/${this.settings.spFolder.replace(/\\/g, '/')}`;
            spRelUrl = spRelUrl.replace('://', '').replace(this.settings.siteUrl.replace('://', '').split('/')[0], '').replace(/\/\//g, '/');
            filePath = filePath.replace(path.resolve(this.settings.watchBase), spRelUrl).replace(/\\/g, '/').replace(/\/\//g, '/');
            filePath = decodeURIComponent(filePath);
        }
        this.io.emit('liveReload', filePath);
    }

    // Init live reload server
    public runServer() {
        const app = express();
        const staticRouter = express.Router();
        staticRouter.get('/*', (req, res) => {
            if (req.url.indexOf('/socket.io') !== -1) {
                console.log(__dirname);
                let staticFilePath = path.join(__dirname, '/../node_modules', '/socket.io-client/dist' + req.url);
                res.sendFile(staticFilePath);
                return;
            } else if (req.url === '/live-reload.client.js') {
                if (typeof this.liveReloadClientContent === 'undefined') {
                    let liveReloadClientPath = path.join(__dirname + '/static' + req.url);
                    let confString: string = JSON.stringify({
                        protocol: this.settings.protocol,
                        host: this.settings.host,
                        port: this.settings.port
                    });
                    this.liveReloadClientContent = String(fs.readFileSync(liveReloadClientPath))
                        .replace(`"##settings#"`, confString).replace(`'##settings#'`, confString);
                }
                res.setHeader('content-type', 'text/javascript');
                res.send(this.liveReloadClientContent);
                return;
            } else {
                let staticRoot = path.join(__dirname + '/static');
                res.sendFile(path.join(staticRoot, req.url));
                return;
            }
        });
        app.use('/s', staticRouter);

        if (this.settings.protocol === 'https') {
            if (typeof this.settings.ssl === 'undefined') {
                console.log('Error: No SSL settings provided!');
                return;
            }
            let options = {
                key: fs.readFileSync(this.settings.ssl.key),
                cert: fs.readFileSync(this.settings.ssl.cert)
            };
            let https = require('https');
            let server = https.createServer(options, app);
            this.io = require('socket.io')(server);
            server.listen(this.settings.port, this.settings.host, () => {
                console.log('Live reload server is up and running at %s://%s:%s',
                    this.settings.protocol, this.settings.host, this.settings.port);
                console.log('Make sure that:');
                console.log(' - monitoring script (%s://%s:%s/s/live-reload.client.js) is provisioned to SharePoint.',
                    this.settings.protocol, this.settings.host, this.settings.port);
                console.log(' - SSL certificate is trusted in the browser.');
            });
        } else {
            let server = require('http').Server(app);
            this.io = require('socket.io')(server);
            server.listen(this.settings.port, this.settings.host, () => {
                console.log('Live reload server is up and running at %s://%s:%s',
                    this.settings.protocol, this.settings.host, this.settings.port);
                console.log('Make sure that monitoring script (%s://%s:%s/s/live-reload.client.js) is provisioned to SharePoint.',
                    this.settings.protocol, this.settings.host, this.settings.port);
            });
        }
    }

    private getUserCustomActions(): Promise<any> {
        return this.provisioning.getUserCustomActions();
    }

    private provisionMonitoringAction(): Promise<any> {
        return this.provisioning.provisionMonitoringAction();
    }

    private retractMonitoringAction(): Promise<any> {
        return this.provisioning.retractMonitoringAction();
    }

}

module.exports = LiveReload;
