/* eslint-disable no-await-in-loop */
// import util from 'util';
import axios from 'axios';

import { fetchAuth } from '../../setup.js';
import { delay, chunkBy, downloadFile } from '../../util.js';
import { scan, identify } from '../identify.js';

const searchPeriod = 1000 * 60 * 60 * 24 * 7;
const pages = 1;
const chunkSize = 1;

export default {
    cmds: ['check'],
    desc: 'Test command; Check clips',
    params: [],

    func: async ({ twitchClient, chatClient, channel }) => {
        console.log('Checking...');
        chatClient.say(channel, 'Checking...');

        const { clientId2 } = await fetchAuth();

        const endDate = new Date().toISOString();
        const startDate = new Date(Date.now() - searchPeriod).toISOString();

        const clipsRequest = twitchClient.helix.clips.getClipsForBroadcasterPaginated(136765278, { startDate, endDate });

        let i = 0;

        for (let iter = 0; iter < pages; iter++) {
            let clipsCollection = await clipsRequest.getNext();
            if (!clipsCollection.length) break;
            clipsCollection = chunkBy(clipsCollection, chunkSize);

            // clipsCollection = [[await twitchClient.helix.clips.getClipById('AwkwardSpeedyIcecreamKevinTurtle')]];

            for (const clips of clipsCollection) {
                console.log('Fetching!');

                await Promise.all(
                    clips.map(async (clip) => {
                        console.log('clip', clip);
                        const { data: responseData } = await axios({
                            method: 'POST',
                            url: 'https://gql.twitch.tv/gql',
                            headers: {
                                'Client-Id': clientId2,
                                'Content-Type': 'text/plain;charset=UTF-8',
                            },
                            data: [
                                {
                                    operationName: 'VideoAccessToken_Clip',
                                    // variables: { slug: clip.id },
                                    variables: { slug: clip.id },
                                    extensions: {
                                        persistedQuery: {
                                            version: 1,
                                            sha256Hash: '9bfcc0177bffc730bd5a5a89005869d2773480cf1738c592143b5173634b7d15',
                                        },
                                    },
                                },
                            ],
                        });

                        // Get lowest quality above 400p if available... otherwise highest available.
                        const mp4Collection = responseData[0].data.clip.videoQualities
                            .map(mp4Data => ({
                                ...mp4Data,
                                quality: parseInt(mp4Data.quality, 10),
                            }))
                            .sort((a, b) => b.quality - a.quality);
                        const mp4CollectionGood = mp4Collection.filter(mp4Data => mp4Data.quality > 400);
                        const mp4Data = mp4CollectionGood.length > 0 ? mp4CollectionGood[mp4CollectionGood.length - 1] : mp4Collection[0];

                        clip.mp4Url = mp4Data.sourceURL;

                        console.log('Fetched clip mp4 urls');

                        clip.mp4Name = `${clip.id}.mp4`;
                        clip.mp4Path = `./src/mp4/${clip.mp4Name}`;

                        await downloadFile(clip.mp4Url, clip.mp4Path);

                        console.log('Saved mp4s to file system');

                        const fingerPath = await scan(clip.mp4Name);
                        const songData = await identify(fingerPath);

                        if (!songData) return false;

                        clip.song = songData.metadata.music[0];

                        return true;
                    })
                );

                const clipsSongs = clips.filter(clip => clip.song !== undefined);

                console.log('Outputting data');

                for (const clip of clipsSongs) {
                    i++;
                    console.log(i, clip);
                    chatClient.say(
                        channel,
                        `${i} | ${String(clip.creationDate).substr(0, 15)} | ${clip.url} | ${clip.views} views -->> ${clip.song.artists.map(
                            artist => artist.name
                        )} | ${clip.song.title} | ${clip.song.label}`
                    );
                }

                return; // end early

                await delay(1000 * 1);
            }
        }

        chatClient.say(channel, 'Checked!');
        console.log('Check handled!');
    },
};
