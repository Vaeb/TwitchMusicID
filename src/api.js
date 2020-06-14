import util from 'util';
import fs from 'fs';
import http from 'http';
import https from 'https';
import express from 'express';
import cors from 'cors';
import pretty from 'express-prettify';
import bodyParser from 'body-parser';

import { dbPromise } from './db.js';
import { getClipsByIds, chunkBy } from './util.js';

(async () => {
    const db = await dbPromise;

    const httpPort = 8000;
    const httpsPort = 3000;

    const app = express();

    app.use(cors('*'));
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

            query.channel = query.channel.toLowerCase();

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
                console.log('/music-clips error 1');
                return res.status(400).send({
                    success: false,
                    error: 'Missing required parameter: "channel"',
                });
            }

            query.channel = query.channel.toLowerCase();

            const clipsCollection = db.collection('clips');

            const hasClips = !!(await clipsCollection.find({ channel: query.channel }).limit(1).count(1));

            if (!hasClips) {
                console.log('/music-clips error 2');
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
            query.page = parseInt(query.page, 10);
            query.limit = parseInt(query.limit, 10);

            if (query.minimal) {
                projectionObj = { slug: 1, views: 1, _id: 0 };
            }

            if (query.unchecked) {
                queryObj = { channel: query.channel, $or: [{ song: { $exists: true } }, { fingerprintFailed: true }, { identified: false }] };
            } else if (query.unchecked_only) {
                queryObj = { channel: query.channel, identified: false };
            } else {
                queryObj = { channel: query.channel, $or: [{ song: { $exists: true } }, { fingerprintFailed: true }] };
            }

            let musicClipsCursor = clipsCollection
                .find(queryObj)
                .project(projectionObj)
                .sort({ views: -1 });

            const clipBatchSize = 600;
            if (query.page) {
                musicClipsCursor = musicClipsCursor.skip((query.page - 1) * clipBatchSize).limit(clipBatchSize);
            }

            if (query.limit) {
                musicClipsCursor = musicClipsCursor.limit(query.limit);
            }

            const clipsBatches = chunkBy(await musicClipsCursor.toArray(), 100);
            const musicClips = [];
            const deleteSlugs = [];

            await Promise.all(clipsBatches.map(async (clipsBatch) => {
                const clipsExistingMap = Object.assign(
                    {},
                    ...(await getClipsByIds(clipsBatch.map(clipRecord => clipRecord.slug))).map(clip => ({ [clip.id]: clip }))
                );
                clipsBatch.forEach((clipRecord) => {
                    if (clipsExistingMap[clipRecord.slug]) {
                        musicClips.push({ ...clipRecord, title: clipsExistingMap[clipRecord.slug].title });
                    } else {
                        deleteSlugs.push(clipRecord.slug);
                    }
                });
            }));

            if (!query.minimal) {
                musicClips.forEach((clipRecord, i) => {
                    clipRecord.url = `https://clips.twitch.tv/${clipRecord.slug}`;
                    if (!query.pretty) clipRecord.number = i + 1;
                });
            }

            res.send({
                success: true,
                count: musicClips.length,
                clips: musicClips,
            });

            if (deleteSlugs.length > 0) {
                console.log('Removing', deleteSlugs.length, 'deleted clips from the db');
                clipsCollection.remove({ slug: { $in: deleteSlugs } });
            }
        } catch (err) {
            console.log('/music-clips error 3:', err);
            return res.status(400).send({
                success: false,
                error: util.format(err),
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
