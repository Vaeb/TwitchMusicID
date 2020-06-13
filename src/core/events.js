import { twitchClientPromise, chatClientPromise, commands, connectedPromise } from '../setup.js';
import { sendMessage } from '../util.js';

(async () => {
    const twitchClient = await twitchClientPromise;
    const chatClient = await chatClientPromise;

    chatClient.onPrivmsg((channel, user, message) => {
        if (user !== 'vaeben' && user !== 'morlega') return;

        const [messageCmd, ...messageArgs] = message.split(' ');

        const send = (...args) => sendMessage(chatClient, channel, ...args);

        for (const command of commands) {
            if (command.cmds.some(cmd => cmd === messageCmd)) {
                command.func({
                    twitchClient,
                    chatClient,
                    send,
                    channel,
                    user,
                    message,
                    args: messageArgs,
                });

                break;
            }
        }
    });

    console.log('Ran events module');

    // if (process.platform !== 'win32') {
    //     await connectedPromise;

    //     const send = (...args) => sendMessage(chatClient, 'vaeben', ...args);

    //     const identifyCommand = commands.find(command => command.name == 'identify');
    //     identifyCommand.func({
    //         send,
    //     });
    // }
})();
