import express, { query } from 'express';
import bodyParser from 'body-parser';

import { dbPromise } from './db.js';

(async () => {
    const db = await dbPromise;

    const PORT = 3000;

    const app = express();

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    app.get('/api/music-clips', async (req, res) => {
        try {
            console.log('API request received:', req.query);
            const { channel, minimal } = req.query;

            if (!channel) {
                return res.status(400).send({
                    success: false,
                    error: 'Missing required parameter: "channel"',
                });
            }

            const clipsCollection = db.collection('clips');

            const hasClips = !!(await clipsCollection.find({ channel }).limit(1).count(1));

            if (!hasClips) {
                return res.status(400).send({
                    success: false,
                    error: `There are no clips in the database for channel "${channel}"`,
                });
            }

            let projectionObj = {};

            if (parseInt(minimal, 10)) {
                projectionObj = { slug: 1, _id: 0 };
            }

            console.log(projectionObj);

            const musicClips = await clipsCollection.find({ channel, $or: [{ song: { $exists: true } }, { fingerprintFailed: true }] }).project(projectionObj).sort({ views: -1 }).toArray();

            return res.send({
                success: true,
                clips: musicClips,
            });
        } catch (err) {
            return res.status(400).send({
                success: false,
                error: err,
            });
        }
    });

    app.listen(PORT, () => {
        console.log(`TwitchMusicID listening on port ${PORT}!`);
    });

    console.log('Ran API module');
})();
