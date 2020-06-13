import fs from 'fs';
import http from 'http';
import https from 'https';
import express from 'express';
import pretty from 'express-prettify';
import bodyParser from 'body-parser';

import { dbPromise } from './db.js';

(async () => {
    const db = await dbPromise;

    const httpPort = 8000;
    const httpsPort = 3000;

    const app = express();

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(pretty({ query: 'pretty' }));

    app.get('/api/has-clips', async (req, res) => {
        try {
            const { query } = req;
            console.log('API request received:', query);

            if (!query.channel) {
                return res.status(400).send({
                    success: false,
                    error: 'Missing required parameter: "channel"',
                });
            }

            const clipsCollection = db.collection('clips');

            const hasClips = !!(await clipsCollection.find({ channel: query.channel }).limit(1).count(1));

            return res.send({
                success: true,
                hasClips,
            });
        } catch (err) {
            return res.status(400).send({
                success: false,
                error: err,
            });
        }
    });

    app.get('/api/music-clips', async (req, res) => {
        try {
            const { query } = req;
            console.log('API request received:', query);

            if (!query.channel) {
                return res.status(400).send({
                    success: false,
                    error: 'Missing required parameter: "channel"',
                });
            }

            const clipsCollection = db.collection('clips');

            const hasClips = !!(await clipsCollection.find({ channel: query.channel }).limit(1).count(1));

            if (!hasClips) {
                return res.status(400).send({
                    success: false,
                    error: `There are no clips in the database for channel "${query.channel}"`,
                });
            }

            let queryObj = {};
            let projectionObj = {};

            query.minimal = parseInt(query.minimal, 10);
            query.unchecked = parseInt(query.unchecked, 10);
            query.unchecked_only = parseInt(query.unchecked_only, 10);
            query.pretty = parseInt(query.pretty, 10);

            if (query.minimal) {
                projectionObj = { slug: 1, _id: 0 };
            }

            if (query.unchecked) {
                queryObj = { channel: query.channel, $or: [{ song: { $exists: true } }, { fingerprintFailed: true }, { identified: false }] };
            } else if (query.unchecked_only) {
                queryObj = { channel: query.channel, identified: false };
            } else {
                queryObj = { channel: query.channel, $or: [{ song: { $exists: true } }, { fingerprintFailed: true }] };
            }

            const musicClips = await clipsCollection
                .find(queryObj)
                .project(projectionObj)
                .sort({ views: -1 })
                .toArray();

            if (!query.minimal) {
                musicClips.forEach((clipRecord, i) => {
                    clipRecord.url = `https://clips.twitch.tv/${clipRecord.slug}`;
                    if (!query.pretty) clipRecord.number = i + 1;
                });
            }

            return res.send({
                success: true,
                count: musicClips.length,
                clips: musicClips,
            });
        } catch (err) {
            return res.status(400).send({
                success: false,
                error: err,
            });
        }
    });

    if (process.platform === 'win32') {
        app.listen(httpPort, () => {
            console.log(`TwitchMusicID http server listening on port ${httpPort}!`);
        });
    } else {
        const privateKey = fs.readFileSync('/etc/letsencrypt/live/vaeb.io/privkey.pem', 'utf8');
        const certificate = fs.readFileSync('/etc/letsencrypt/live/vaeb.io/cert.pem', 'utf8');
        const ca = fs.readFileSync('/etc/letsencrypt/live/vaeb.io/chain.pem', 'utf8');

        const credentials = { key: privateKey, cert: certificate, ca };

        const httpServer = http.createServer(app);
        const httpsServer = https.createServer(credentials, app);

        httpServer.listen(httpPort, () => {
            console.log(`TwitchMusicID http server listening on port ${httpPort}!`);
        });

        httpsServer.listen(httpsPort, () => {
            console.log(`TwitchMusicID https listening on port ${httpsPort}!`);
        });
    }

    console.log('Ran API module');
})();
