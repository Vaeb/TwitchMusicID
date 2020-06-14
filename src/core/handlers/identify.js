/* eslint-disable no-await-in-loop */
// import { format } from 'util';

import { fetchAuth } from '../../setup.js';
import {
    delay, makeDocumentFromClip, fetchChannelId,
} from '../../util.js';
import { identifyClip } from '../identification.js';
import { dbPromise } from '../../db.js';


const identifyTopClips = async (send, clientId2, clipsCollection, batchSize, batchNum, channelName) => {
    let numAppeared = 0;
    const recordsActive = {};
    const bulkWrites = [];

    send('\n\n---\nStarting new batch:', batchNum);
    console.log('');

    await new Promise((resolve) => { // When promise resolves, all batchSize records should be updated to `identified: true`
        clipsCollection.find({ channel: channelName, identified: false }).sort({ views: -1 }).limit(batchSize).forEach(async (clipRecord) => {
            recordsActive[clipRecord.slug] = true;
            numAppeared++;
            clipRecord.id = clipRecord.slug;

            console.log(`[${batchNum}]`, 'Identifying top clip:', clipRecord.slug);

            const songData = await identifyClip(clipRecord, clientId2); // songData on success+music, true on success+no_music, false on failure

            console.log(`[${batchNum}]`, 'Results found for clip', clipRecord.slug, '>>>', clipRecord.song, '>', clipRecord.fingerprintFailed);

            if (songData) { // songData means no error
                bulkWrites.push({
                    replaceOne: {
                        filter: { slug: clipRecord.slug },
                        replacement: makeDocumentFromClip(clipRecord, true, channelName),
                    },
                });
            }

            delete recordsActive[clipRecord.slug];
            if (numAppeared >= batchSize && Object.keys(recordsActive).length === 0) {
                resolve(true);
            }
        });
    });

    const numWrites = bulkWrites.length;

    send(`\n[${batchNum}] Batch completed, processing ${numWrites} bulk-writes`);

    if (numWrites > 0) {
        await clipsCollection.bulkWrite(bulkWrites, { ordered: false });
    }

    return numWrites;
};

export default {
    cmds: ['identify'],
    desc: 'Identify music in the top stored clips',
    params: [],

    func: async ({ send, args }) => {
        if (process.platform === 'win32') return;

        const channelTargetName = args[0];
        send(`\nIdentifying top clips for ${channelTargetName}...`);
        // const channelTargetId = await fetchChannelId(channelTargetName);

        const { clientId2 } = await fetchAuth();

        const db = await dbPromise;
        const clipsCollection = db.collection('clips');

        const searchLimit = 20000;
        const batchSize = 4;
        let clipsChecked = 0;
        let batchNum = 0;

        while ((clipsChecked + batchSize) <= searchLimit) {
            batchNum++;
            for (let i = 0; i < 6; i++) {
                try {
                    const numResults = await identifyTopClips(send, clientId2, clipsCollection, batchSize, batchNum, channelTargetName);
                    await delay(numResults > 0 ? 1000 * 3 : 500);
                    break;
                } catch (err) {
                    console.log('\n', i, 'Caught scan error:', err);
                    await delay(1000 * 3);
                    send('Scan failed, retrying');
                }
            }
            clipsChecked += batchSize;
        }

        send('Finished identifying!');
    },
};
