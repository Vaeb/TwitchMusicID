/* eslint-disable no-await-in-loop */
// import util from 'util';
// import { format } from 'util';

import { fetchAuth } from '../../setup.js';
import {
    delay, fetchClipsPages, makeDocumentFromClip, dString, fetchChannelId,
} from '../../util.js';
import { clipsStored } from '../identification.js';
import { dbPromise } from '../../db.js';

const delayTime1 = 1000 * 0.1; // 1000 * 3
const delayTime2 = 1000 * 0.6; // 1000 * 3

const scan = async (clientId2, clipsCollection, send, startStamp, endStamp, isCheckingDb, channelName, channelId) => {
    // startStamp = new Date('1970-01-02'); endStamp = new Date('2037-12-30');
    send('\n\nScanning between', dString(new Date(startStamp)), 'and', dString(new Date(endStamp)), '...');

    const clipPages = fetchClipsPages(channelId, { startDate: startStamp, endDate: endStamp });

    const newDocuments = [];
    const seenClips = {};

    let addedSome = false;

    let clips;
    let page = 0;
    while ((clips = await clipPages.getNext()).length) {
        page++;
        console.log('\n\nChecking page', page);

        // if (isCheckingDb) {
        console.log('Checking db for existing clips');
        const clipRecords = await clipsStored(clips, clipsCollection);
        for (let i = 0; i < clipRecords.length; i++) {
            seenClips[clipRecords[i].slug] = true;
        }
        // }

        for (let i = 0; i < clips.length; i++) {
            const clip = clips[i];
            if (!seenClips[clip.id]) {
                seenClips[clip.id] = true;
                newDocuments.push(makeDocumentFromClip(clip, false, channelName));
                addedSome = true;
            }
        }

        console.log('Adding', newDocuments.length, 'new clips to db', newDocuments[newDocuments.length - 1]);

        if (addedSome) await delay(delayTime1);

        console.log('Checked page', page);
        // if (page >= 2) return;
    }

    send('Checked', page, `page${page > 1 ? 's' : ''}`, '||', 'Added', newDocuments.length, 'new clips');

    if (newDocuments.length > 0) {
        try {
            clipsCollection.insertMany(newDocuments, { ordered: false }); // When ordered is false duplicate slugs erroring won't affect the other documents
            console.log('Inserting documents now!');
        } catch (err) {
            console.log('Got a mongo error (expected?):', err);
        }
    }

    await delay(delayTime2);

    return newDocuments.length;
};

const findOldestClipDate = async (channelId) => {
    const startStamp = 1463702400000;
    let endStamp = +new Date();

    let clips = [];

    let stampOffset = 1;

    do {
        const clipPages = fetchClipsPages(channelId, { startDate: startStamp, endDate: endStamp + stampOffset });
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

    func: async ({ send, args }) => {
        const channelTargetName = args[0];
        send('Scanning', `${channelTargetName}...`);
        const channelTargetId = await fetchChannelId(channelTargetName);

        const { clientId2 } = await fetchAuth();

        const db = await dbPromise;
        const clipsCollection = db.collection('clips');
        let oldestStartDate;

        for (let i = 0; i < 5; i++) {
            try {
                console.log('Fetching oldest clip date');
                oldestStartDate = +(await findOldestClipDate(channelTargetId)) - 1000 * 60 * 60 * 24;
                console.log('Found oldest clip date:', oldestStartDate, dString(new Date(oldestStartDate)));
                break;
            } catch (err) {
                console.log(i, 'Failed to fetch oldest clip date:', err);
                await delay(1000 * 3);
            }
        }

        if (oldestStartDate === undefined) return;

        // let timeframeSizeOriginal = 1000 * 60 * 80;
        let timeframeSizeOriginal = 1000 * 60 * 60 * 24 * 8;
        let timeframeBetweenOriginal = timeframeSizeOriginal;
        const timeframes = [[timeframeSizeOriginal, timeframeBetweenOriginal]];

        while (timeframeSizeOriginal > 1000 * 60 * 5) {
            timeframeSizeOriginal = Math.floor(timeframeSizeOriginal / 2);
            timeframeBetweenOriginal = timeframeSizeOriginal;
            timeframes.push([timeframeSizeOriginal, timeframeBetweenOriginal]);
        }

        console.log('timeframes', timeframes);

        let batchNum = 0;

        // return;

        for (let timeframe = 0; timeframe < timeframes.length; timeframe++) {
            const [timeframeSize, timeframeBetween] = timeframes[timeframe];

            batchNum++;
            let startStampNow = +new Date();
            if (batchNum === 1) startStampNow = +new Date('2019-03-14 18:05:52') + timeframeBetween;
            // if (batchNum < 4) continue;

            send('\n\nStarting batch scan', batchNum, 'of size / offset:', timeframeSize, '/', timeframeBetween, '...');

            let isCheckingDb = true;

            while (startStampNow > oldestStartDate) {
                startStampNow -= timeframeBetween;
                const endStampNow = startStampNow + timeframeSize;

                for (let i = 0; i < 6; i++) {
                    try {
                        const numAdded = await scan(clientId2, clipsCollection, send, startStampNow, endStampNow, isCheckingDb, channelTargetName, channelTargetId); // Get up to 10 pages of clips
                        if (isCheckingDb && numAdded > 0) {
                            isCheckingDb = false;
                        }
                        break;
                    } catch (err) {
                        console.log('\n', i, 'Caught scan error:', err);
                        await delay(1000 * 3);
                        send('Scan failed, retrying');
                    }
                }
                // return;
            }

            send('\nCompleted batch scan', batchNum);
        }

        send('Scanned!');
    },
};
