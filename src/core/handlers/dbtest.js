import { dbPromise } from '../../db.js';

export default {
    cmds: ['dbtest'],
    desc: 'Test the mongo db is working',
    params: [],

    func: async ({ chatClient, channel }) => {
        try {
            const db = await dbPromise;

            console.log('db', db);

            const numClips = await db.collection('clips').count();

            chatClient.say(channel, `Found ${numClips} clips!`);
            console.log(`Found ${numClips} clips!`);
        } catch (err) {
            console.log('[dbtest]', err);
        }
    },
};
