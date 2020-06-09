export default {
    cmds: ['ping'],
    desc: 'Test the bot is working',
    params: [],

    func: async ({ chatClient, channel }) => {
        chatClient.say(channel, 'Pong!');
        console.log('Ping handled!');
    },
};
