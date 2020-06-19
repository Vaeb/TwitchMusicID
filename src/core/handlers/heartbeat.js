// import { dString } from '../../util.js';

export default {
    cmds: ['heartbeat'],
    desc: 'Test the twitch client is working',
    params: [],

    func: async ({ chatClient, send }) => {
        send('Sending heartbeat...');
        chatClient.getMods('twitch')
            .then(() => {
                send('Performed heartbeat fetch');
            })
            .catch((err) => {
                send('Heartbeat fetch failed:', err);
            });
    },
};
