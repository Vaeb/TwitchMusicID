import { twitchClientPromise, chatClientPromise, commands } from '../setup.js';

(async () => {
    const twitchClient = await twitchClientPromise;
    const chatClient = await chatClientPromise;

    chatClient.onPrivmsg((channel, user, message) => {
        if (user !== 'vaeben') return;

        const [messageCmd, ...messageArgs] = message.split(/\s+/);

        for (const command of commands) {
            if (command.cmds.some(cmd => cmd === messageCmd)) {
                command.func({
                    twitchClient,
                    chatClient,
                    channel,
                    user,
                    message,
                    messageArgs,
                });
                break;
            }
        }
    });

    console.log('Ran events module');
})();
