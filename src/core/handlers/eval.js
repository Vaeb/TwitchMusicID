const util = require('util');
const childProcess = require('child_process');

const setupMod = require('../../setup.js');
const dbMod = require('../../db.js');
const utilMod = require('../../util.js');

const { format } = util;
const { execFile } = childProcess;
const { dbPromise } = dbMod;
const {
    sendMessage, delay, chunkBy, downloadFile, fetchClips, fetchClipsPages, fetchClipById, dString, getClipsByIds,
} = utilMod;

const execFileAsync = util.promisify(execFile);

export default {
    cmds: ['eval'],
    desc: 'Test the mongo db is working',
    params: [],

    func: async ({
        twitchClient, chatClient, channel, user, args,
    }) => {
        const tc = twitchClient;
        const cc = chatClient;
        const db = await dbPromise;
        const dbClips = db.collection('clips');
        const argsFull = args.join(' ');
        const send = sendMessage.bind(this, chatClient, channel);

        const code = `(async () => {\n${argsFull}\n})()`;

        try {
            const result = await eval(code);
            console.log('Eval result:', result);

            if (result !== undefined) {
                send(`Output: ${format(result)}`);
            }
        } catch (err) {
            console.log('Eval Error:', err);
            send(`Error: ${format(err)}`);
        }
    },
};
