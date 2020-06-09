import { chatClientPromise } from './setup.js';
import './core/events.js';

(async () => {
    const chatClient = await chatClientPromise;
    await chatClient.connect();

    console.log('Loaded TwitchMusicId!');
})();

process.on('unhandledRejection', (error, p) => {
    if (error.isAxiosError) {
        console.log('Unhandled Rejection (Axios):', error.response);
    } else {
        console.log('Unhandled Rejection at: Promise', p, 'reason:', error);
    }
});
