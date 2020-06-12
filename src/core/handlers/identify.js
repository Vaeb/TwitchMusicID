/* eslint-disable no-await-in-loop */
// import util from 'util';
import fs from 'fs';
import { format } from 'util';
import axios from 'axios';

import { fetchAuth } from '../../setup.js';
import {
    delay, chunkBy, downloadFile, fetchClipsPages, makeDocumentFromClip,
} from '../../util.js';
import { clipsStored, identifyClip } from '../identification.js';
import { dbPromise } from '../../db.js';

const pages = 1; // <= 100 clips
const skipPages = 0;
const skipClips = 0; // If both skipPages and skipClips are above 0, the one which skips the most clips is used
const chunkSize = 3;
const delayTime = 1000 * 3;
const batches = 1;

const identifyClipsArray = async (clientId2, clipsCollection, send, startStamp, endStamp) => {
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

        const clipChunks = chunkBy(clips, chunkSize);

        for (let i = 0; i < clipChunks.length; i++) {
            const clipsSubset = clipChunks[i];
            let didScan = false;

            await Promise.all(clipsSubset.map(async (clip) => {
                if (storedSlugs[clip.id]) return;

                const songData = await identifyClip(clip, clientId2); // songData on success+music, true on success+no_music, false on failure

                if (songData) {
                    newDocuments.push(makeDocumentFromClip(clip));
                    didScan = didScan || typeof songData === 'object';
                }
                // send(format(clip));
            }));

            if (didScan) {
                await delay(delayTime);
            }
        }

        console.log('newDocuments', newDocuments);
        console.log('Added', newDocuments.length, 'new clips to db');

        if (newDocuments.length > 0) {
            clipsCollection.insertMany(newDocuments, { ordered: false });
        }

        send('Checked page', page);

        // if (page >= 2) return;
    }
};

const identifyTopClips = (clientId2, clipsCollection) => {
    const searchLimit = 10;
    let numAppeared = 0;
    const recordsActive = {};

    return new Promise((resolve) => {
        clipsCollection.find({ identified: false }).sort({ views: -1 }).limit(10).forEach(async (clipRecord) => {
            recordsActive[clipRecord.slug] = true;
            numAppeared++;

            console.log(clipRecord.slug);

            delete recordsActive[clipRecord.slug];
            if (numAppeared >= searchLimit && Object.keys(recordsActive).length === 0) {
                console.log('Resolving');
                resolve(true);
            }
        });
    });
};

export default {
    cmds: ['identify'],
    desc: 'Identify music in the top stored clips',
    params: [],

    func: async ({ twitchClient, send, channel }) => {
        send('Identifying top clips...');

        const { clientId2 } = await fetchAuth();

        const db = await dbPromise;
        const clipsCollection = db.collection('clips');

        await identifyTopClips(clientId2, clipsCollection);

        send('Finished identifying!');
    },
};
