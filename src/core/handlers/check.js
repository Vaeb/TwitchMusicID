import axios from 'axios';

import { delay, chunkBy } from '../../util.js';
import { audioSessionId } from '../../hidden.js';

export default {
    cmds: ['check'],
    desc: 'Test command; Check clips',
    params: [],

    func: async ({ twitchClient, chatClient, channel }) => {
        console.log('Checking...');
        chatClient.say(channel, 'Checking...');

        const endDate = new Date().toISOString();
        const startDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString();

        const clipsRequest = twitchClient.helix.clips.getClipsForBroadcasterPaginated(136765278, { startDate, endDate });

        let i = 0;

        for (let iter = 0; iter < 1; iter++) {
            // eslint-disable-next-line no-await-in-loop
            const clips = await clipsRequest.getNext();

            if (!clips.length) break;

            const clipChunks = chunkBy(clips, 10);

            for (const clipChunk of clipChunks) {
                console.log('Fetching!');
                let clipResultsNow = (
                // eslint-disable-next-line no-await-in-loop
                    await Promise.all(
                        clipChunk.map(async (clip) => {
                            const {
                                data: { success, message: clipAudioId },
                            } = await axios.get('https://twitchaudio.com/api.php', {
                                params: {
                                    action: 'newJobClip',
                                    clip_slug: clip.id,
                                },
                                headers: { cookie: `PHPSESSID=${audioSessionId}` },
                            });

                            if (!success) return { status: false };

                            const { data: song } = await axios.get('https://twitchaudio.com/api.php', {
                                params: {
                                    action: 'jobClipStatus',
                                    id: clipAudioId,
                                },
                                headers: { cookie: `PHPSESSID=${audioSessionId}` },
                            });

                            // if (song.status === 'failed') return false;

                            return { clip, song, status: song.status };
                        }),
                    )
                );

                // clipResults = [...clipResults, ...clipResultsNow.filter(clipData => clipData.status === 'successful')];
                console.log('Fetched!!!', ...clipResultsNow.map(data => `[[${data.clip.title} --- ${data.song.status}]]`));

                clipResultsNow = clipResultsNow.filter(clipData => clipData.status === 'successful');

                for (const clipData of clipResultsNow) {
                    const { clip, song } = clipData;
                    console.log(++i, '|', clip.title, clip.url, clip.creationDate, clip.views, '|', song.status, song.title, song.artists, song);
                    chatClient.say(
                        channel,
                        `${i} | ${clip.title} ${clip.url} ${String(clip.creationDate).substr(0, 15)} ${clip.views} views | ${song.title}, ${
                            song.artists
                        }`,
                    );
                }

                // eslint-disable-next-line no-await-in-loop
                await delay(1000 * 1);
            }
        }

        chatClient.say(channel, 'Checked!');
        console.log('Check handled!');
    },
};
