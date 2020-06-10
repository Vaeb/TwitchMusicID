import util from 'util';
import { execFile } from 'child_process';
import fs from 'fs';
import crypto from 'crypto';
import axios from 'axios';
import request from 'request';

import { host, accessKey, accessSecret } from '../hidden.js';

const execFileAsync = util.promisify(execFile);

const options = {
    host,
    endpoint: '/v1/identify',
    signature_version: '1',
    data_type: 'fingerprint',
    secure: true,
    access_key: accessKey,
    access_secret: accessSecret,
};

export const scan = async (idNum, fileName) => {
    try {
        const { stderr } = await execFileAsync(
            'acrcloud_extr_linux',
            ['-cli', '-l', '61', '-i', `./mp4/${fileName}`, '--debug'],
            { cwd: './src' }
        );

        if (stderr && stderr.includes('create fingerprint error ')) {
            console.log('>', idNum, '[scan] stderr:', stderr);
            return { error: stderr };
        }

        return `./src/mp4/${fileName}.cli.lo`;
    } catch (err) {
        console.log('>', idNum, '[scan] Error:', err);
        return null;
    }
};

/**
 * Identifies a sample of bytes
 */
function upload(data) {
    const timestamp = Math.floor((new Date()).getTime() / 1000);

    const signString = ['POST', options.endpoint, accessKey, options.data_type, options.signature_version, timestamp].join('\n');

    const signature = crypto.createHmac('sha1', accessSecret).update(Buffer.from(signString, 'utf-8')).digest().toString('base64'); // sign

    const formData = {
        sample: data,
        access_key: options.access_key,
        data_type: options.data_type,
        signature_version: options.signature_version,
        signature,
        sample_bytes: data.length,
        timestamp,
    };

    // return axios({
    //     method: 'POST',
    //     url: `http://${options.host}${options.endpoint}`,
    //     data: formData,
    //     headers: {
    //         'Content-Type': 'multipart/form-data',
    //     },
    // });

    return new Promise((resolve, reject) => {
        request.post({
            url: `http://${options.host}${options.endpoint}`,
            method: 'POST',
            formData,
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        }, (err, httpResponse, body) => {
            if (err) return reject(err);
            return resolve(JSON.parse(body));
        });
    });
}

export const identify = async (idNum, filePath) => {
    // filePath = './src/mp4/Holiday.mp3.cli.lo';
    console.log('>', idNum, 'Identifying', filePath);

    const bitmap = fs.readFileSync(filePath);

    try {
        const response = await upload(Buffer.from(bitmap));
        console.log('>', idNum, 'Response:', response, response.status.code == 0 ? response.metadata.music.map(song => `<${song.score}>`).join(', ') : '');

        // if (response.status.code != 0) return false;

        return response;
    } catch (err) {
        console.log('>', idNum, '[identify] Error:', err);
        return null;
    }
};
