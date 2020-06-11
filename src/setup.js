import TwitchClient from 'twitch';
import ChatClient from 'twitch-chat-client';
import * as fs from 'fs-extra';
import glob from 'glob';
import path from 'path';

console.log(`\n\n\n${'-'.repeat(120)}`);

export const prefix = ';';

let connectedResolve;
export const getConnectedResolve = () => connectedResolve;
export const connectedPromise = new Promise((resolve) => {
    connectedResolve = resolve;
});

export const fetchAuth = async () => JSON.parse(await fs.readFile('./src/auth.json'));

let twitchClientInternal;
let chatClientInternal;

export const fetchTwitchClient = () => twitchClientInternal;

export const fetchChatClient = () => chatClientInternal;

export const twitchClientPromise = new Promise(async (resolve) => {
    const credentials = await fetchAuth();

    twitchClientInternal = TwitchClient.withCredentials(credentials.clientId, credentials.accessToken, undefined, {
        clientSecret: credentials.clientSecret,
        refreshToken: credentials.refreshToken,
        expiry: credentials.expiryTimestamp === null ? null : new Date(credentials.expiryTimestamp),
        onRefresh: async ({ accessToken, refreshToken, expiryDate }) => {
            const newCredentials = {
                ...credentials,
                accessToken,
                refreshToken,
                expiryTimestamp: expiryDate === null ? null : expiryDate.getTime(),
            };

            console.log('Refreshing to:', accessToken, refreshToken, expiryDate);

            await fs.writeFile('./src/auth.json', JSON.stringify(newCredentials, null, 4), 'UTF-8');
        },
    });

    console.log('Loaded TwitchClient');
    resolve(twitchClientInternal);
});

export const chatClientPromise = new Promise(async (resolve) => {
    const twitchClient = await twitchClientPromise;
    chatClientInternal = await ChatClient.forTwitchClient(twitchClient, { channels: ['vaeben', 'morlega'] });

    console.log('Loaded ChatClient');
    resolve(chatClientInternal);
});

export const commands = [];

glob.sync('./src/core/handlers/**/*.js').forEach((file) => {
    const filePath = path.resolve(file);

    const command = require(filePath).default;

    if (!command) {
        console.log('Command data not found:', file);
        return;
    }

    command.name = command.cmds[0];
    command.cmds = command.cmds.map(cmd => `${prefix}${cmd.toLowerCase()}`);
    if (!command.desc) command.desc = 'Command description not provided';
    if (!command.params) command.params = [];

    commands.push(command);
});

console.log('Ran setup module');
