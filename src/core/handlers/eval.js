import util from 'util';
import { execFile } from 'child_process';

const setupModule = require('../../setup.js');
const dbModule = require('../../db.js');
const utilModule = require('../../util.js');

const { dbPromise } = dbModule;
const { sendMessage, delay, chunkBy, downloadFile, fetchClips, fetchClipsPages, fetchClipById } = utilModule;

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
        const argsFull = args.join(' ');
        const send = sendMessage.bind(this, chatClient, channel);

        const code = `(async () => {\n${argsFull}\n})()`;

        try {
            const result = await eval(code);
            console.log('Eval result:', result);

            if (result !== undefined) {
                send(`Output: ${util.format(result)}`);
            }
        } catch (err) {
            console.log('Eval Error:', err);
            send(`Error: ${util.format(err)}`);
        }
    },
};
