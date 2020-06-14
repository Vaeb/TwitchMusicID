// ==UserScript==
// @name         Vaeb's Music-Clip Remover
// @namespace    https://vaeb.io/
// @copyright    Vaeb
// @version      0.1
// @description  Frontend part of the music-clip remover process
// @author       Vaeb
// @match        https://www.twitch.tv/mute
// @grant        GM_addStyle
// @grant        unsafeWindow
// @downloadURL  https://vaeb.io/nomusic.user.js
// @updateURL    https://vaeb.io/nomusic.user.js
// @run-at       document-start
// ==/UserScript==

/* eslint-disable strict */

'use strict';

const apiUrl = 'https://vaeb.io:3000/api';
const globalClientId = 'kimne78kx3ncx6brgo4mv6wki5h1ko';
let $$;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
let clientData;
let deleteHeaders;
let clipsRemoved = 0;

const loadScripts = () => {
    console.log('Loading scripts...');

    const jqueryScript = document.createElement('script');
    jqueryScript.type = 'text/javascript';
    jqueryScript.src = 'https://code.jquery.com/jquery-3.5.1.min.js';

    const cookieScript = document.createElement('script');
    cookieScript.type = 'text/javascript';
    cookieScript.src = 'https://cdn.jsdelivr.net/npm/js-cookie@2.2.1/src/js.cookie.min.js';

    const particleScriptCss = document.createElement('link');
    particleScriptCss.rel = 'stylesheet';
    particleScriptCss.media = 'screen';
    particleScriptCss.href = 'https://vaeb.io/assets/css/particles.css';

    const fontCss = document.createElement('link');
    fontCss.rel = 'stylesheet';
    fontCss.href = 'https://fonts.googleapis.com/css2?family=Roboto&display=swap';

    document.head.appendChild(jqueryScript);
    document.head.appendChild(cookieScript);
    document.head.appendChild(particleScriptCss);
    document.head.appendChild(fontCss);

    document.body.innerHTML += `
        <div id="particles-js"></div>
    `;

    const particleScript = document.createElement('script');
    particleScript.type = 'text/javascript';
    particleScript.src = 'https://vaeb.io/assets/scripts/particles.js';

    // const particleScriptApp = document.createElement('script');
    // particleScriptApp.type = 'text/javascript';
    // particleScriptApp.src = 'https://vaeb.io/assets/scripts/particlesLoad.js';

    document.body.appendChild(particleScript);
    // document.body.appendChild(particleScriptApp);

    const particleInterval = unsafeWindow.setInterval(async () => {
        if (!unsafeWindow.particlesJS) return;
        clearInterval(particleInterval);
        await delay(200);
        unsafeWindow.particlesJS('particles-js', {
            particles: {
                number: {
                    value: 60,
                    density: {
                        enable: true,
                        value_area: 800,
                    },
                },
                color: {
                    value: '#000000',
                },
                shape: {
                    type: 'circle',
                    stroke: {
                        width: 0,
                        color: '#000000',
                    },
                    polygon: {
                        nb_sides: 5,
                    },
                    image: {
                        src: 'img/github.svg',
                        width: 100,
                        height: 100,
                    },
                },
                opacity: {
                    value: 0.5,
                    random: false,
                    anim: {
                        enable: false,
                        speed: 1,
                        opacity_min: 0.1,
                        sync: false,
                    },
                },
                size: {
                    value: 5,
                    random: true,
                    anim: {
                        enable: false,
                        speed: 40,
                        size_min: 0.1,
                        sync: false,
                    },
                },
                line_linked: {
                    enable: true,
                    distance: 150,
                    color: '#000000',
                    opacity: 0.4,
                    width: 1,
                },
                move: {
                    enable: true,
                    speed: 6,
                    direction: 'none',
                    random: false,
                    straight: false,
                    out_mode: 'out',
                    attract: {
                        enable: false,
                        rotateX: 600,
                        rotateY: 1200,
                    },
                },
            },
            interactivity: {
                detect_on: 'window',
                events: {
                    onhover: {
                        enable: true,
                        mode: 'repulse',
                    },
                    onclick: {
                        enable: false,
                        mode: 'push',
                    },
                    resize: true,
                },
                modes: {
                    grab: {
                        distance: 400,
                        line_linked: {
                            opacity: 1,
                        },
                    },
                    bubble: {
                        distance: 400,
                        size: 40,
                        duration: 2,
                        opacity: 8,
                        speed: 3,
                    },
                    repulse: {
                        distance: 200,
                    },
                    push: {
                        particles_nb: 4,
                    },
                    remove: {
                        particles_nb: 2,
                    },
                },
            },
            retina_detect: true,
            config_demo: {
                hide_card: false,
                background_color: '#b61924',
                background_image: '',
                background_position: '50% 50%',
                background_repeat: 'no-repeat',
                background_size: 'cover',
            },
        });
        unsafeWindow.clearInterval(particleInterval);
    }, 50);
};

const makeUi = () => {
    console.log('Making UI...');
    console.log(clientData);

    GM_addStyle(`
        * {
            font-family: 'Roboto', sans-serif !important;
        }

        body {
            height: 100vh;
        }

        div#main {
            height: calc(100% - 100px);
            display: flex;
            flex-direction: column;
            flex-wrap: nowrap;
            justify-content: center;
            align-items: center;
            align-content: stretch;
        }

        div.loginName {
            // margin-bottom: 10px;
        }

        .horizEls {
            display: flex;
            flex-direction: row;
            flex-wrap: nowrap;
            justify-content: space-around;
            align-items: center;
            align-content: stretch;
        }

        div.horizEls {
            margin: 15px 0 0 0;
        }

        button {
            margin: 0 5px 0 5px;
        }

        button, input {
            z-index: 99999;
        }

        div#output {
            position: absolute;
            top: 62%;
            left: 0%;
            width: 100%;
            height: 28%;
            background-color: lightgrey;
            z-index: 99999;
            border: 0;
            margin: 0;
            padding: 10px 5px 10px 5px;
            box-sizing: border-box;
            overflow-y: auto;
            font-size: 16px;
        }

        input#delete_test_input {

        }
    `);

    document.body.innerHTML += `
        <div id="main">
            <div id="loginName">Logged in as: ${clientData.displayName}</div>
            <div class="horizEls">
                <button id="list_music">List music clips</button>
                <button id="list_unchecked">List unchecked clips</button>
                <button id="list_music_unchecked">List music + unchecked clips</button>
            </div>
            <div class="horizEls">
                <button id="delete_music">Delete music clips</button>
                <button id="delete_unchecked">Delete unchecked clips</button>
                <button id="delete_music_unchecked">Delete music + unchecked clips</button>
            </div>
            <div class="horizEls">
                <input id="delete_test_input" type="text"></input>
                <button id="delete_test">Manual delete</button>
            </div>
        </div>

        <div id="output">
        </div>
    `;
};

const clearOutput = () => $$('#output').empty();

const output = (out) => {
    const $output = $$('#output');
    if (typeof out === 'string') {
        output($$('<div>').text(out));
    } else {
        $output.append(...out);
    }
};

const shortenString = (str, len = 50) => {
    if (str != null) {
        return str.length <= len ? str : `${str.substr(0, len)}...`;
    }

    return '<N/A>';
};

const makeLink = link => $$('<a>').attr('href', link).text(link);

const outputClips = (clips) => {
    const out = [];

    clips.forEach((clip) => {
        const link = `https://clips.twitch.tv/${clip.slug}`;

        const $clipDiv = $$('<div>');

        $clipDiv.append(makeLink(link), ' - ', `${clip.views} views`);

        if (clip.song) {
            $clipDiv.append(
                ' --> ',
                shortenString(clip.song.title, 60),
                ' - ',
                shortenString(clip.song.artists.map(artist => artist.name).join(' & '), 55),
                ' - ',
                shortenString(clip.song.label, 30)
            );
        }

        $clipDiv.append($$('<br>'), $$('<br>'));

        out.push($clipDiv);
    });

    output(out);
};

const deleteClip = async (slug, views) => {
    console.log('Deleting clip:', slug);

    const gqlObject = [];
    gqlObject[0] = {
        operationName: 'Clips_DeleteClips',
        variables: { input: { slugs: [slug] } },
        extensions: { persistedQuery: { version: 1, sha256Hash: 'df142a7eec57c5260d274b92abddb0bd1229dc538341434c90367cf1f22d71c4' } },
    };

    try {
        const result = await $$.ajax({
            url: 'https://gql.twitch.tv/gql',
            type: 'POST',
            headers: deleteHeaders,
            timeout: 45000,
            data: JSON.stringify(gqlObject),
            contentType: 'application/json',
        });

        console.log('result', result);

        if (result[0].errors && result[0].errors[0].message) {
            output(`Internal deletion error for clip ${slug}: ${result[0].errors[0].message}`);
            return;
        }

        if (result[0].data && result[0].data.deleteClips && result[0].data.deleteClips.__typename !== 'undefined' && result[0].data.deleteClips.__typename == 'DeleteClipsPayload') {
            clipsRemoved++;
            output(`(${clipsRemoved}) Successfully deleted clip: ${slug}`);
            return;
        }

        output(`Deletion failed for clip ${slug}. Reason unknown.`);
    } catch (err) {
        output(`Script deletion error for clip ${slug}: ${JSON.stringify(err)}`);
    }
};

const makeUiLogic = () => {
    $$('#list_music').click(async () => {
        clearOutput();
        output('Fetching data, this may take a few seconds...');

        const { clips } = await $$.ajax({
            type: 'GET',
            // url: `${apiUrl}/music-clips?channel=${clientData.displayName}`,
            url: `${apiUrl}/music-clips?channel=buddha`,
            dataType: 'json',
        });

        clearOutput();
        outputClips(clips);
    });

    $$('#list_unchecked').click(async () => {
        clearOutput();
        output('Fetching data, this may take a few seconds...');

        const { clips } = await $$.ajax({
            type: 'GET',
            // url: `${apiUrl}/music-clips?channel=${clientData.displayName}`,
            url: `${apiUrl}/music-clips?channel=buddha&unchecked_only=1&limit=600`,
            dataType: 'json',
        });

        clearOutput();
        output([
            unsafeWindow
                .$('<div>')
                .append(
                    'There are too many clips to list. If you would like to view the full list manually, go to: ',
                    makeLink(`${apiUrl}/music-clips?channel=${clientData.displayName}&unchecked_only=1&pretty=1`)
                ),
            $$('<br/>'),
            $$('<br/>'),
        ]);
        outputClips(clips);
    });

    $$('#list_music_unchecked').click(async () => {
        clearOutput();
        output('Fetching data, this may take a few seconds...');

        const { clips } = await $$.ajax({
            type: 'GET',
            // url: `${apiUrl}/music-clips?channel=${clientData.displayName}`,
            url: `${apiUrl}/music-clips?channel=buddha&unchecked=1&limit=600`,
            dataType: 'json',
        });

        clearOutput();
        output([
            unsafeWindow
                .$('<div>')
                .append(
                    'There are too many clips to list. If you would like to view the full list manually, go to: ',
                    makeLink(`${apiUrl}/music-clips?channel=${clientData.displayName}&unchecked=1&pretty=1`)
                ),
            $$('<br/>'),
            $$('<br/>'),
        ]);
        outputClips(clips);
    });

    $$('#delete_test').click(async () => {
        clearOutput();

        const slugData = unsafeWindow
            .$('#delete_test_input')
            .val()
            .match(/.+\/([\w\d]+).*?$|^([\w\d]+)$/);

        if (!slugData) return;

        const slug = slugData[1] || slugData[2];

        deleteClip(slug);
    });
};

const areScriptsLoaded = () => new Promise((resolve) => {
    const interval = setInterval(() => {
        if (unsafeWindow.jQuery && unsafeWindow.Cookies) {
            console.log('Scripts found!');
            $$ = unsafeWindow.$;
            resolve(true);
            clearInterval(interval);
        } else {
            console.log('Waiting for scripts...');
        }
    }, 50);
});

const loadClientData = () => {
    const clientDataRaw = unsafeWindow.Cookies.get('twilight-user');

    if (clientDataRaw === undefined) {
        alert('You must be logged in to Twitch to use this tool.');
        throw new Error('Not logged in');
    }

    clientData = JSON.parse(decodeURIComponent(clientDataRaw));
    clientData.oAuth = `OAuth ${clientData.authToken}`;

    deleteHeaders = {
        Authorization: clientData.oAuth,
        'Client-Id': globalClientId,
    };
};

const init = async () => {
    await delay(25);

    window.stop();

    console.log('Clearing existing DOM...');

    document.head.innerHTML = `
        <title>Vaeb's Music-Clip Remover</title>
    `;
    document.body.innerHTML = '';

    loadScripts();

    await areScriptsLoaded();

    loadClientData();
    makeUi();
    makeUiLogic();
};

init();
