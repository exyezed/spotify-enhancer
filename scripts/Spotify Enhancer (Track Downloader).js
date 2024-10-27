// ==UserScript==
// @name         Spotify Enhancer (Track Downloader)
// @description  Integrate download buttons for tracks in the Spotify web player, allowing downloads at 320kbps.
// @icon         https://raw.githubusercontent.com/exyezed/spotify-enhancer/refs/heads/main/extras/spotify-enhancer.png
// @version      1.0
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
    maxRetries: 3,
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
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: url('data:image/svg+xml;utf8,<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path fill-rule="evenodd" clip-rule="evenodd" d="M12 3C12.5523 3 13 3.44772 13 4V12.5858L15.2929 10.2929C15.6834 9.90237 16.3166 9.90237 16.7071 10.2929C17.0976 10.6834 17.0976 11.3166 16.7071 11.7071L12.7071 15.7071C12.5196 15.8946 12.2652 16 12 16C11.7348 16 11.4804 15.8946 11.2929 15.7071L7.2929 11.7071C6.90238 11.3166 6.90238 10.6834 7.2929 10.2929C7.68342 9.90237 8.31659 9.90237 8.70711 10.2929L11 12.5858V4C11 3.44772 11.4477 3 12 3ZM4.00001 14C4.55229 14 5.00001 14.4477 5.00001 15C5.00001 15.9772 5.00485 16.3198 5.05765 16.5853C5.29437 17.7753 6.22466 18.7056 7.41474 18.9424C7.68018 18.9952 8.02276 19 9.00001 19H15C15.9772 19 16.3198 18.9952 16.5853 18.9424C17.7753 18.7056 18.7056 17.7753 18.9424 16.5853C18.9952 16.3198 19 15.9772 19 15C19 14.4477 19.4477 14 20 14C20.5523 14 21 14.4477 21 15C21 15.0392 21 15.0777 21 15.1157C21.0002 15.9334 21.0004 16.4906 20.9039 16.9755C20.5094 18.9589 18.9589 20.5094 16.9755 20.9039C16.4907 21.0004 15.9334 21.0002 15.1158 21C15.0778 21 15.0392 21 15 21H9.00001C8.96084 21 8.92225 21 8.88423 21C8.06664 21.0002 7.50935 21.0004 7.02456 20.9039C5.0411 20.5094 3.49061 18.9589 3.09608 16.9755C2.99965 16.4906 2.99978 15.9334 2.99999 15.1158C3 15.0777 3.00001 15.0392 3.00001 15C3.00001 14.4477 3.44772 14 4.00001 14Z" fill="%23ffffff"></path> </g></svg>');
    background-position: center;
    background-repeat: no-repeat;
    background-size: 60%;
}
.btn:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    background: linear-gradient(135deg, #00ff69, #00ab46);
}
[data-testid='tracklist-row'] .btn {
    position: absolute;
    top: 50%;
    right: 100%;
    margin-top: -20px;
    margin-right: 10px;
}
.btn.loading::after, .btn.retrying::after {
    display: none;
}
.btn.loading, .btn.retrying {
    background: linear-gradient(135deg, #00da5a, #008f3b);
}
.loading-spinner {
    display: none;
    width: 24px;
    height: 24px;
}
.btn.loading .loading-spinner, .btn.retrying .loading-spinner {
    display: block;
    color: white;
    transform: scale(0.75);
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

    while (attempts < RETRY_CONFIG.maxRetries) {
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

            if (attempts === RETRY_CONFIG.maxRetries) {
                console.error('Download failed after all retry attempts:', error);
                alert(`Download failed after ${RETRY_CONFIG.maxRetries} attempts: ${error.message}`);
                button.classList.remove('loading', 'retrying');
                return;
            }

            console.log(`Attempt ${attempts} failed, retrying in ${currentDelay}ms...`);
            button.classList.add('retrying');

            await delay(currentDelay);

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

    const spinnerSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" class="loading-spinner">
        <rect width="2.8" height="12" x="1" y="6" fill="currentColor">
            <animate id="svgSpinnersBarsScale0" attributeName="y" begin="0;svgSpinnersBarsScale1.end-0.1s" calcMode="spline" dur="0.6s" keySplines=".36,.61,.3,.98;.36,.61,.3,.98" values="6;1;6"/>
            <animate attributeName="height" begin="0;svgSpinnersBarsScale1.end-0.1s" calcMode="spline" dur="0.6s" keySplines=".36,.61,.3,.98;.36,.61,.3,.98" values="12;22;12"/>
        </rect>
        <rect width="2.8" height="12" x="5.8" y="6" fill="currentColor">
            <animate attributeName="y" begin="svgSpinnersBarsScale0.begin+0.1s" calcMode="spline" dur="0.6s" keySplines=".36,.61,.3,.98;.36,.61,.3,.98" values="6;1;6"/>
            <animate attributeName="height" begin="svgSpinnersBarsScale0.begin+0.1s" calcMode="spline" dur="0.6s" keySplines=".36,.61,.3,.98;.36,.61,.3,.98" values="12;22;12"/>
        </rect>
        <rect width="2.8" height="12" x="10.6" y="6" fill="currentColor">
            <animate attributeName="y" begin="svgSpinnersBarsScale0.begin+0.2s" calcMode="spline" dur="0.6s" keySplines=".36,.61,.3,.98;.36,.61,.3,.98" values="6;1;6"/>
            <animate attributeName="height" begin="svgSpinnersBarsScale0.begin+0.2s" calcMode="spline" dur="0.6s" keySplines=".36,.61,.3,.98;.36,.61,.3,.98" values="12;22;12"/>
        </rect>
        <rect width="2.8" height="12" x="15.4" y="6" fill="currentColor">
            <animate attributeName="y" begin="svgSpinnersBarsScale0.begin+0.3s" calcMode="spline" dur="0.6s" keySplines=".36,.61,.3,.98;.36,.61,.3,.98" values="6;1;6"/>
            <animate attributeName="height" begin="svgSpinnersBarsScale0.begin+0.3s" calcMode="spline" dur="0.6s" keySplines=".36,.61,.3,.98;.36,.61,.3,.98" values="12;22;12"/>
        </rect>
        <rect width="2.8" height="12" x="20.2" y="6" fill="currentColor">
            <animate id="svgSpinnersBarsScale1" attributeName="y" begin="svgSpinnersBarsScale0.begin+0.4s" calcMode="spline" dur="0.6s" keySplines=".36,.61,.3,.98;.36,.61,.3,.98" values="6;1;6"/>
            <animate attributeName="height" begin="svgSpinnersBarsScale0.begin+0.4s" calcMode="spline" dur="0.6s" keySplines=".36,.61,.3,.98;.36,.61,.3,.98" values="12;22;12"/>
        </rect>
    </svg>`;

    button.innerHTML = spinnerSvg;
    el.appendChild(button);
    el.hasButton = true;
    return button;
}

setInterval(animate, 1000);
