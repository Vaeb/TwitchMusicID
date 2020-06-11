/* eslint-disable */ 
import { format } from 'util';

const setupModule = require('../../setup.js');
const dbModule = require('../../db.js');
const utilModule = require('../../util.js');

const { dbPromise } = dbModule;
const { sendMessage, delay, chunkBy, downloadFile, dString, toUtcDate } = utilModule;

export default {
    cmds: ['test'],
    desc: '',
    params: [],

    func: async ({
        twitchClient, chatClient, send, channel, user, args,
    }) => {
        global.grab = (startDate, endDate, limit, extras) => twitchClient.helix.clips.getClipsForBroadcasterPaginated(136765278, { startDate: new Date(startDate), endDate: new Date(endDate), limit, ...extras });
        global.grab2 = (startDate, endDate, limit, extras) => twitchClient.helix.clips.getClipsForBroadcaster(136765278, { startDate: new Date(startDate), endDate: new Date(endDate), limit, ...extras });

        global.a = 0;
        global.b = {};

        let dateStartAll = '2019-04-01 18:00:00';
        let dateEndAll = '2019-04-02 00:00:00';

        const dateSize = 1000 * 60 * 60 * 6; // 1000 * 60 * 60 * 24 * 0.5;
        const dateBetween = dateSize; // 1000 * 60 * 60 * 24 * 0.5;

        dateStartAll = toUtcDate(dateStartAll);
        dateEndAll = toUtcDate(dateEndAll);

        const dates = [[dateStartAll, new Date(+dateStartAll + dateSize)]];

        global.check = async (startDate, endDate, t) => {
            if (typeof startDate === 'string') startDate = toUtcDate(startDate);
            if (typeof endDate === 'string') endDate = toUtcDate(endDate);

            const clips = grab(startDate, endDate);
            const lengths = [];
            let totalNow = 0;
            const totalNowFiltered = {};
            for (let i = 0; i < 11; i++) {
                const collection = await clips.getNext();
                lengths.push(collection.length);
                totalNow += collection.length;
                if (t !== undefined) global.a += collection.length;
                collection.forEach((clip, idx) => {
                    if (t !== undefined) global.b[clip.id] = [t, i, idx];
                    totalNowFiltered[clip.id] = [t, i, idx];
                });
            }

            const sendArr = [dString(startDate), '-', dString(endDate), ':', lengths, '>>>', 'totalNow', totalNow, '||', 'totalNowFiltered', Object.keys(totalNowFiltered).length];
            if (t !== undefined) sendArr.push('||', 'totalAll', global.a, '||', 'totalAllFiltered', Object.keys(global.b).length);
            send(...sendArr);
        };

        while (+dates[dates.length - 1][1] < +dateEndAll) {
            const lastDateBlock = dates[dates.length - 1];

            const dateStart = +lastDateBlock[0] + dateBetween;

            const dateEnd = dateStart + dateSize;

            dates.push([new Date(dateStart), new Date(dateEnd)]);
        }

        console.log(dates);


        for (let t = 0; t < dates.length; t++) {
            console.log('t ---', t);
            await global.check(dates[t][0], dates[t][1], t);
        }

        send('-------------------------------------------------------');
    },
};
