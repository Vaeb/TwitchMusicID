/* eslint-disable no-await-in-loop */
// import util from 'util';
import fs from 'fs';
import { format } from 'util';
import axios from 'axios';

import { fetchAuth } from '../../setup.js';
import { delay, chunkBy, downloadFile, fetchClipsPages, makeDocumentFromClip } from '../../util.js';
import { clipsStored, identifyClip } from '../identify.js';
import { dbPromise } from '../../db.js';

const pages = 1; // <= 100 clips
const skipPages = 0;
const skipClips = 0; // If both skipPages and skipClips are above 0, the one which skips the most clips is used
const chunkSize = 3;
const delayTime = 1000 * 3;
const batches = 1;

const scan = async (clientId2, clipsCollection, send, startStamp, endStamp) => {
    startStamp = undefined; endStamp = undefined;
    send('\n\nScanning between', new Date(startStamp), 'and', new Date(endStamp), '...');

    const clipPages = fetchClipsPages(136765278, { startDate: startStamp, endDate: endStamp });

    let clips;
    let page = 0;
    while ((clips = await clipPages.getNext()).length) {
        page++;
        console.log('\n\nChecking page', page);

        const clipRecords = await clipsStored(clips, clipsCollection);
        const storedSlugs = Object.assign({}, ...clipRecords.map(clipRecord => ({ [clipRecord.slug]: true })));

        const newDocuments = [];
        await Promise.all(clips.map(async (clip) => {
            if (storedSlugs[clip.id]) return;

            const songData = await identifyClip(clip, clientId2); // songData on success+music, true on success+no_music, false on failure

            if (songData) {
                newDocuments.push(makeDocumentFromClip(clip));
            }
            // send(format(clip));
        }));

        console.log('newDocuments', newDocuments);
        console.log('Added', newDocuments.length, 'new clips to db');

        if (newDocuments.length > 0) {
            clipsCollection.insertMany(newDocuments, { ordered: false });
        }

        send('Checked page', page);

        if (page >= 1) return;
    }
};

const findOldestClipDate = async () => {
    const startStamp = 1463702400000;
    let endStamp = +new Date();

    let clips = [];

    let stampOffset = 1;

    do {
        const clipPages = fetchClipsPages(136765278, { startDate: startStamp, endDate: endStamp + stampOffset });
        clips = await clipPages.getNext();

        if (clips.length) {
            const newEndStamp = clips.reduce((acc, clip) => Math.min(+clip.creationDate, acc), Infinity);
            if (newEndStamp === endStamp) stampOffset = -1;
            endStamp = newEndStamp;
        }
    } while (clips.length > 0);

    return endStamp;
};

export default {
    cmds: ['scan'],
    desc: 'Scan channel for clips; save to db',
    params: [],

    func: async ({ twitchClient, send, channel }) => {
        send('Scanning...');

        const { clientId2 } = await fetchAuth();

        const db = await dbPromise;
        const clipsCollection = db.collection('clips');

        console.log('Fetching oldest clip date');
        const oldestStartDate = +(await findOldestClipDate()) - (1000 * 60 * 60 * 24);
        console.log('Found oldest clip date:', oldestStartDate);

        let timeframeSize = 1000 * 60 * 80;
        let timeframeBetween = timeframeSize;

        while (timeframeSize >= 1000 * 60 * 5) {
            let startStampNow = +new Date();

            while (startStampNow > oldestStartDate) {
                startStampNow -= timeframeBetween;
                const endStampNow = startStampNow + timeframeSize;

                await scan(clientId2, clipsCollection, send, startStampNow, endStampNow); // Get up to 10 pages of clips
                return;
            }

            timeframeSize = Math.floor(timeframeSize / 2);
            timeframeBetween = timeframeSize;
        }

        send('Scanned!');
    },
};
