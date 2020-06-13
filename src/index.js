import { chatClientPromise, getConnectedResolve, commands } from './setup.js';
import './db.js';
import './api.js';
import './core/events.js';
import { sendMessage } from './util.js';

(async () => {
    const chatClient = await chatClientPromise;
    await chatClient.connect();
    getConnectedResolve()(true);

    if (process.platform !== 'win32') {
        const send = (...args) => sendMessage(chatClient, 'vaeben', ...args);

        const identifyCommand = commands.find(command => command.name == 'identify');
        identifyCommand.func({
            send,
        });
    }

    console.log('Loaded TwitchMusicId!');
})();

process.on('unhandledRejection', (error, p) => {
    if (error.isAxiosError) {
        console.log('Unhandled Rejection (Axios):', error.response);
    } else {
        console.log('Unhandled Rejection at: Promise', p, 'reason:', error);
    }
});
