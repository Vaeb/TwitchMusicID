import { dbPromise } from '../../db.js';

export default {
    cmds: ['dbtest'],
    desc: 'Test the mongo db is working',
    params: [],

    func: async ({ chatClient, channel }) => {
        try {
            const db = await dbPromise;

            console.log('db', typeof db);

            const numClips = await db.collection('clips').countDocuments();

            chatClient.say(channel, `Found ${numClips} clips!`);
            console.log(`Found ${numClips} clips!`);
        } catch (err) {
            console.log('[dbtest]', err);
        }
    },
};
