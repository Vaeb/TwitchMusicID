import TwitchClient from 'twitch';
import ChatClient from 'twitch-chat-client';
import * as fs from 'fs-extra';
import glob from 'glob';
import path from 'path';

export const prefix = ';';

export const fetchAuth = async () => JSON.parse(await fs.readFile('./src/auth.json'));

export const twitchClientPromise = new Promise(async (resolve) => {
    const credentials = await fetchAuth();

    const twitchClient = TwitchClient.withCredentials(credentials.clientId, credentials.accessToken, undefined, {
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
    resolve(twitchClient);
});

export const chatClientPromise = new Promise(async (resolve) => {
    const twitchClient = await twitchClientPromise;
    const chatClient = await ChatClient.forTwitchClient(twitchClient, { channels: ['vaeben', 'morlega'] });

    console.log('Loaded ChatClient');
    resolve(chatClient);
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
