import * as fs from 'fs';
import * as path from 'path';
import * as express from 'express';
import * as socketIOServer from 'socket.io';
import * as http from 'http';
import * as https from 'https';

import { ILRSettings, ISSLConf, ILREmittedObject } from './interfaces';

export class LiveReload {

  public settings: ILRSettings;
  private io: socketIOServer.Server;
  private liveReloadClientContent: string;

  public constructor (settings: ILRSettings) {
    this.settings = {
      ...settings,
      port: typeof settings.port !== 'undefined' ? settings.port : 3000,
      host: typeof settings.host !== 'undefined' ? settings.host : 'localhost',
      protocol: typeof settings.protocol !== 'undefined' ? settings.protocol :
        (settings.siteUrl || '').toLowerCase().indexOf('https://') === 0 ? 'https' : 'http'
    };
  }

  // Triggers file update emition to the client
  public emitUpdatedPath (filePath: string, raw: boolean = false, body?: string) {
    if (!raw) {
      let spRelUrl: string = `${this.settings.siteUrl}/${this.settings.spFolder.replace(/\\/g, '/')}`;
      spRelUrl = spRelUrl.replace('://', '').replace(this.settings.siteUrl.replace('://', '').split('/')[0], '').replace(/\/\//g, '/');
      filePath = filePath.replace(path.resolve(this.settings.watchBase), spRelUrl).replace(/\\/g, '/').replace(/\/\//g, '/');
      filePath = decodeURIComponent(filePath).toLowerCase();
    }
    this.io.emit('live_reload', { filePath, body } as ILREmittedObject);
  }

  // Init live reload server
  public runServer () {
    const app = express();
    const staticRouter = express.Router();
    staticRouter.get('/*', (req, res) => {
      if (req.url.indexOf('/socket.io') !== -1) {
        const staticFilePath = path.join(process.cwd(), 'node_modules', '/socket.io-client/dist', req.url.split('?')[0]);
        res.sendFile(staticFilePath);
        return;
      } else if (req.url.indexOf('/live-reload.client.js') !== -1) {
        if (typeof this.liveReloadClientContent === 'undefined') {
          const liveReloadClientPath = path.join(__dirname, '/static', req.url.split('?')[0]);
          const confString: string = JSON.stringify({
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
        const staticRoot = path.join(__dirname, '/static');
        res.sendFile(path.join(staticRoot, req.url.split('?')[0]));
        return;
      }
    });
    app.use('/s', staticRouter);

    let server: http.Server | https.Server;
    if (this.settings.protocol === 'https') {
      if (typeof this.settings.ssl === 'undefined') {
        console.log('Error: No SSL settings provided!');
        return;
      }
      const options = {
        key: fs.readFileSync(this.settings.ssl.key),
        cert: fs.readFileSync(this.settings.ssl.cert)
      };
      server = https.createServer(options, app);
    } else {
      server = new http.Server(app);
    }
    this.io = socketIOServer(server);
    server.listen(this.settings.port, this.settings.host, () => {
      const address = `${this.settings.protocol}://${this.settings.host}:${this.settings.port}`;
      console.log(`Live reload server is up and running at ${address}`);
      if (this.settings.protocol === 'https') {
        console.log('Make sure that:');
        console.log(` - monitoring script (%s://%s:%s/s/live-reload.client.js) is provisioned to SharePoint.`);
        console.log(` - SSL certificate is trusted in the browser.`);
      } else {
        console.log(`Make sure that monitoring script (${address}/s/live-reload.client.js) is provisioned to SharePoint.`);
      }
    });
  }

}
