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

const identifyTopClips = async (send, clientId2, clipsCollection, batchSize, batchNum) => {
    let numAppeared = 0;
    const recordsActive = {};
    const bulkWrites = [];

    send('\n\n---\nStarting new batch:', batchNum);
    console.log('');

    await new Promise((resolve) => { // When promise resolves, all batchSize records should be updated to `identified: true`
        clipsCollection.find({ identified: false }).sort({ views: -1 }).limit(batchSize).forEach(async (clipRecord) => {
            recordsActive[clipRecord.slug] = true;
            numAppeared++;
            clipRecord.id = clipRecord.slug;

            console.log(`[${batchNum}]`, 'Identifying top clip:', clipRecord.slug);

            await identifyClip(clipRecord, clientId2); // songData on success+music, true on success+no_music, false on failure

            console.log(`[${batchNum}]`, 'Results found for clip', clipRecord.slug, '>>>', clipRecord.song, '>', clipRecord.fingerprintFailed);

            bulkWrites.push({
                replaceOne: {
                    filter: { slug: clipRecord.slug },
                    replacement: makeDocumentFromClip(clipRecord, true),
                },
            });

            delete recordsActive[clipRecord.slug];
            if (numAppeared >= batchSize && Object.keys(recordsActive).length === 0) {
                resolve(true);
            }
        });
    });

    send(`\n[${batchNum}] Batch completed, processing ${bulkWrites.length} bulk-writes`);

    if (bulkWrites.length > 0) {
        await clipsCollection.bulkWrite(bulkWrites, { ordered: false });
    }
};

export default {
    cmds: ['identify'],
    desc: 'Identify music in the top stored clips',
    params: [],

    func: async ({ twitchClient, send }) => {
        send('\nIdentifying top clips...');

        const { clientId2 } = await fetchAuth();

        const db = await dbPromise;
        const clipsCollection = db.collection('clips');

        const searchLimit = 9;
        const batchSize = 3;
        let clipsChecked = 0;
        let batchNum = 0;

        while ((clipsChecked + batchSize) <= searchLimit) {
            batchNum++;
            await identifyTopClips(send, clientId2, clipsCollection, batchSize, batchNum);
            clipsChecked += batchSize;
        }

        send('Finished identifying!');
    },
};
