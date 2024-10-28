// ==UserScript==
// @name         Spotify Enhancer (Track Downloader)
// @description  Integrate a download button for tracks on Spotify Web to download audio at 320kbps.
// @icon         https://raw.githubusercontent.com/exyezed/spotify-enhancer/refs/heads/main/extras/spotify-enhancer.png
// @version      1.1
// @author       exyezed
// @namespace    https://github.com/exyezed/spotify-enhancer/
// @supportURL   https://github.com/exyezed/spotify-enhancer/issues
// @license      MIT
// @match        *://open.spotify.com/*
// @grant        GM_xmlhttpRequest
// @connect      api.spotifydown.com
// ==/UserScript==

const API_REQUEST_HEADERS = {
    'Host': 'api.spotifydown.com',
    'Referer': 'https://spotifydown.com/',
    'Origin': 'https://spotifydown.com',
};

const RETRY_CONFIG = {
    initialDelay: 1000,
    maxDelay: 5000,
    backoffFactor: 2
};

const style = document.createElement('style');
style.innerText = `
[role='grid'] {
    margin-left: 50px;
}
[data-testid='tracklist-row'] {
    position: relative;
}
[role="presentation"] > * {
    contain: unset;
}
.btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 0;
    background: linear-gradient(135deg, #00da5a, #008f3b);
    position: relative;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
}
.btn::after {
    content: '';
    position: absolute;
    width: 28px;
    height: 28px;
    background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"><g fill="none" stroke="%23ffffff" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path stroke-dasharray="32" stroke-dashoffset="32" d="M12 3c4.97 0 9 4.03 9 9c0 4.97 -4.03 9 -9 9"><animate fill="freeze" attributeName="stroke-dashoffset" dur="0.4s" values="32;0"/><set fill="freeze" attributeName="stroke-dasharray" begin="0.8s" to="2 4"/></path><path stroke-dasharray="32" stroke-dashoffset="32" d="M12 21c-4.97 0 -9 -4.03 -9 -9c0 -4.97 4.03 -9 9 -9"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.4s" dur="0.4s" values="32;0"/></path><path stroke-dasharray="10" stroke-dashoffset="10" d="M12 8v7.5"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.8s" dur="0.2s" values="10;0"/></path><path stroke-dasharray="6" stroke-dashoffset="6" d="M12 15.5l3.5 -3.5M12 15.5l-3.5 -3.5"><animate fill="freeze" attributeName="stroke-dashoffset" begin="1s" dur="0.2s" values="6;0"/></path></g></svg>');
    background-position: center;
    background-repeat: no-repeat;
    background-size: 100%;
}
.btn:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    background: linear-gradient(135deg, #00ff69, #00ab46);
}
.btn.loading::after {
    background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"><g fill="none" stroke="%23ffffff" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"><path stroke-dasharray="2 4" stroke-dashoffset="6" d="M12 3c4.97 0 9 4.03 9 9c0 4.97 -4.03 9 -9 9"><animate attributeName="stroke-dashoffset" dur="0.6s" repeatCount="indefinite" values="6;0"/></path><path stroke-dasharray="32" stroke-dashoffset="32" d="M12 21c-4.97 0 -9 -4.03 -9 -9c0 -4.97 4.03 -9 9 -9"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.1s" dur="0.4s" values="32;0"/></path><path stroke-dasharray="10" stroke-dashoffset="10" d="M12 8v7.5"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.5s" dur="0.2s" values="10;0"/></path><path stroke-dasharray="6" stroke-dashoffset="6" d="M12 15.5l3.5 -3.5M12 15.5l-3.5 -3.5"><animate fill="freeze" attributeName="stroke-dashoffset" begin="0.7s" dur="0.2s" values="6;0"/></path></g></svg>');
}
[data-testid='tracklist-row'] .btn {
    position: absolute;
    top: 50%;
    right: 100%;
    margin-top: -20px;
    margin-right: 10px;
}
`;
document.body.appendChild(style);

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function attemptDownload(spotifyId) {
    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method: "GET",
            url: `https://api.spotifydown.com/download/${spotifyId}`,
            headers: API_REQUEST_HEADERS,
            onload: response => {
                try {
                    const result = JSON.parse(response.responseText);
                    if (!result.success) {
                        reject(new Error(result.message || 'Download failed'));
                    } else {
                        resolve(result);
                    }
                } catch (error) {
                    reject(new Error('Failed to parse response'));
                }
            },
            onerror: reject
        });
    });
}

async function downloadWithRetry(spotifyId, trackInfo) {
    const button = this;
    button.classList.add('loading');

    let currentDelay = RETRY_CONFIG.initialDelay;
    let attempts = 0;

    while (true) { // Infinite retry loop
        try {
            const response = await attemptDownload(spotifyId);

            const link = document.createElement('a');
            link.href = response.link;
            if (trackInfo) {
                link.download = `${trackInfo.title} - ${trackInfo.artist}.mp3`;
            }
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            button.classList.remove('loading', 'retrying');
            return;
        } catch (error) {
            attempts++;
            console.log(`Attempt ${attempts} failed, retrying in ${currentDelay}ms...`);
            button.classList.add('retrying');

            await delay(currentDelay);

            // Increase delay with backoff, but cap at maxDelay
            currentDelay = Math.min(
                currentDelay * RETRY_CONFIG.backoffFactor,
                RETRY_CONFIG.maxDelay
            );
        }
    }
}

const downloadTrack = downloadWithRetry;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getTrackInfoFromArtist(trackElement) {
    const titleElement = trackElement.querySelector('.encore-text.encore-text-body-medium');
    const artistElement = document.querySelector('span[data-testid="entityTitle"] h1');

    if (titleElement && artistElement) {
        return {
            title: titleElement.textContent.trim(),
            artist: artistElement.textContent.trim()
        };
    }
    return null;
}

function getTrackInfo(trackElement) {
    if (window.location.href.includes('/artist/')) {
        return null;
    }

    const titleElement = trackElement.querySelector('div[data-encore-id="text"][dir="auto"]');
    const artistElements = trackElement.querySelectorAll('a[href^="/artist"]');

    if (titleElement && artistElements.length > 0) {
        const artists = Array.from(artistElements)
            .map(el => el.textContent.trim())
            .join(', ');

        return {
            title: titleElement.textContent.trim(),
            artist: artists
        };
    }
    return null;
}

function animate() {
    const currentUrl = window.location.href;
    const urlParts = currentUrl.split('/');
    const type = urlParts[3];

    if (type === 'artist') {
        const tracks = document.querySelectorAll('[role="gridcell"]');
        for (let i = 0; i < tracks.length; i++) {
            const track = tracks[i];
            if (track.querySelector('.encore-text-body-medium') && !track.hasButton) {
                addButton(track).onclick = async function() {
                    const trackLink = track.querySelector('a[href^="/track"]');
                    if (trackLink) {
                        const spotifyId = trackLink.href.split('/').pop().split('?')[0];
                        const trackInfo = getTrackInfoFromArtist(track);
                        downloadTrack.call(this, spotifyId, trackInfo);
                    }
                }
            }
        }
    } else {
        const tracks = document.querySelectorAll('[data-testid="tracklist-row"]');
        for (let i = 0; i < tracks.length; i++) {
            const track = tracks[i];
            if (!track.hasButton) {
                addButton(track).onclick = async function() {
                    const btn = track.querySelector('[data-testid="more-button"]');
                    btn.click();
                    await sleep(1);
                    const highlight = document.querySelector('#context-menu a[href*="highlight"]').href.match(/highlight=(.+)/)[1];
                    document.dispatchEvent(new MouseEvent('mousedown'));
                    const spotifyId = highlight.split(':')[2];
                    const trackInfo = getTrackInfo(track);
                    downloadTrack.call(this, spotifyId, trackInfo);
                }
            }
        }
    }

    if (type === 'track') {
        const actionBarRow = document.querySelector('[data-testid="action-bar-row"]:last-of-type');
        if (actionBarRow && !actionBarRow.hasButton) {
            addButton(actionBarRow).onclick = function() {
                const id = urlParts[4].split('?')[0];
                const titleElement = document.querySelector('h1');
                const artistElement = document.querySelector('a[href^="/artist"]');
                const trackInfo = titleElement && artistElement ? {
                    title: titleElement.textContent.trim(),
                    artist: artistElement.textContent.trim()
                } : null;
                downloadTrack.call(this, id, trackInfo);
            }
        }
    }
}

function addButton(el) {
    const button = document.createElement('button');
    button.className = 'btn';
    button.title = 'Download';
    el.appendChild(button);
    el.hasButton = true;
    return button;
}

setInterval(animate, 1000);