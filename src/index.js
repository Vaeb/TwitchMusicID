import { chatClientPromise, getConnectedResolve } from './setup.js';
import './db.js';
import './api.js';
import './core/events.js';

(async () => {
    const chatClient = await chatClientPromise;
    await chatClient.connect();
    getConnectedResolve()(true);

    console.log('Loaded TwitchMusicId!');
})();

process.on('unhandledRejection', (error, p) => {
    if (error.isAxiosError) {
        console.log('Unhandled Rejection (Axios):', error.response);
    } else {
        console.log('Unhandled Rejection at: Promise', p, 'reason:', error);
    }
});
