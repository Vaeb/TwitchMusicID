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
const delayTime = 1000 * 1; // 1000 * 3
const batches = 1;

const scan = async (clientId2, clipsCollection, send, startStamp, endStamp) => {
    // startStamp = undefined; endStamp = undefined;
    send('\n\nScanning between', new Date(startStamp), 'and', new Date(endStamp), '...');

    const clipPages = fetchClipsPages(136765278, { startDate: startStamp, endDate: endStamp });

    const newDocuments = [];
    const seenClips = {};

    let clips;
    let page = 0;
    while ((clips = await clipPages.getNext()).length) {
        page++;
        console.log('\n\nChecking page', page);

        for (let i = 0; i < clips.length; i++) {
            const clip = clips[i];
            if (!seenClips[clip.id]) {
                seenClips[clip.id] = true;
                newDocuments.push(makeDocumentFromClip(clip, false));
            }
        }

        console.log('Added', newDocuments.length, 'new clips to db', newDocuments[newDocuments.length - 1]);

        await delay(delayTime);

        send('Checked page', page);
        // if (page >= 2) return;
    }

    if (newDocuments.length > 0) {
        try {
            clipsCollection.insertMany(newDocuments, { ordered: false }); // When ordered is false duplicate slugs erroring won't affect the other documents
        } catch (err) {
            console.log('Got a mongo error (expected?):', err);
        }
    }

    console.log('Finished batch');
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

        // let timeframeSize = 1000 * 60 * 80;
        let timeframeSize = 1000 * 60 * 60 * 24 * 4;
        let timeframeBetween = timeframeSize;

        while (timeframeSize >= 1000 * 60 * 5) {
            let startStampNow = +new Date();

            while (startStampNow > oldestStartDate) {
                startStampNow -= timeframeBetween;
                const endStampNow = startStampNow + timeframeSize;

                for (let i = 0; i < 5; i++) {
                    try {
                        await scan(clientId2, clipsCollection, send, startStampNow, endStampNow); // Get up to 10 pages of clips
                        break;
                    } catch (err) {
                        console.log('Caught scan error:', err);
                        await delay(1000 * 3);
                    }
                }
                // return;
            }

            timeframeSize = Math.floor(timeframeSize / 2);
            timeframeBetween = timeframeSize;
        }

        send('Scanned!');
    },
};
