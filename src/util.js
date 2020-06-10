import fs from 'fs';

import download from 'download';

export const sendMessage = (chatClient, channel, message) => chatClient.say(channel, `${message}`);

export const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export const chunkBy = (arr, size) => arr.reduce((all, one, i) => {
    const ch = Math.floor(i / size);
    all[ch] = [].concat(all[ch] || [], one);
    return all;
}, []);

export const downloadFile = (url, dest) => new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    download(url).pipe(file);

    file.on('finish', () => {
        resolve();
    });

    file.on('error', (err) => {
        file.close();

        if (err.code !== 'EEXIST') {
            fs.unlink(dest, () => {}); // Delete temp file
        }

        reject(err.message);
    });
});
