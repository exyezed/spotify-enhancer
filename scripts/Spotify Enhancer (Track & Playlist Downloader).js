// ==UserScript==
// @name         Spotify Enhancer (Track & Playlist Downloader)
// @description  Add download buttons to Spotify tracks and playlists on the web player, 128Kbps MP3 quality.
// @icon         https://raw.githubusercontent.com/exyezed/spotify-enhancer/refs/heads/main/extras/spotify-enhancer.png
// @version      1.1
// @author       exyezed
// @namespace    https://github.com/exyezed/spotify-enhancer/
// @supportURL   https://github.com/exyezed/spotify-enhancer/issues
// @license      MIT
// @match        *://open.spotify.com/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

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
.btn.loading::after {
    background-image: url('data:image/svg+xml;utf8,<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="none"><g fill="%23ffffff" fill-rule="evenodd" clip-rule="evenodd"><path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8z" opacity=".2"></path><path d="M7.25.75A.75.75 0 018 0a8 8 0 018 8 .75.75 0 01-1.5 0A6.5 6.5 0 008 1.5a.75.75 0 01-.75-.75z"></path></g></svg>');
    animation: spin 2.5s linear infinite;
}
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
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

function getPlaylistInfo() {
    const titleElement = document.querySelector('span[data-testid="entityTitle"] h1');
    
    if (titleElement) {
        return {
            title: titleElement.textContent.trim()
        };
    }
    return null;
}

function sanitizeFileName(name) {
    return name.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, ' ').trim();
}

async function download(path, trackInfo, button) {
    button.classList.add('loading');
    
    const downloadUrl = `https://yank.g3v.co.uk/${path}`;
    
    try {
        if (trackInfo) {
            let fileName;
            if (path.startsWith('playlist/')) {
                fileName = sanitizeFileName(`${trackInfo.title}.zip`);
            } else {
                fileName = sanitizeFileName(`${trackInfo.title} - ${trackInfo.artist}.mp3`);
            }
            
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            window.open(downloadUrl, '_blank');
        }
    } finally {
        await sleep(1000);
        button.classList.remove('loading');
    }
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
                addButton(track).onclick = async function () {
                    const trackLink = track.querySelector('a[href^="/track"]');
                    if (trackLink) {
                        const spotifyId = trackLink.href.split('/').pop().split('?')[0];
                        const trackInfo = getTrackInfoFromArtist(track);
                        await download(`track/${spotifyId}`, trackInfo, this);
                    }
                }
            }
        }
    } else {
        const tracks = document.querySelectorAll('[data-testid="tracklist-row"]');
        for (let i = 0; i < tracks.length; i++) {
            const track = tracks[i];
            if (!track.hasButton) {
                addButton(track).onclick = async function () {
                    const btn = track.querySelector('[data-testid="more-button"]');
                    btn.click();
                    await sleep(1);
                    const highlight = document.querySelector('#context-menu a[href*="highlight"]').href.match(/highlight=(.+)/)[1];
                    document.dispatchEvent(new MouseEvent('mousedown'));
                    const spotifyId = highlight.split(':')[2];
                    const trackInfo = getTrackInfo(track);
                    await download(`track/${spotifyId}`, trackInfo, this);
                }
            }
        }
    }
    
    if (type === 'playlist' || type === 'track') {
        const actionBarRow = document.querySelector('[data-testid="action-bar-row"]:last-of-type');
        if (actionBarRow && !actionBarRow.hasButton) {
            addButton(actionBarRow).onclick = async function () {
                const id = urlParts[4].split('?')[0];
                if (type === 'track') {
                    const titleElement = document.querySelector('h1');
                    const artistElement = document.querySelector('a[href^="/artist"]');
                    const trackInfo = titleElement && artistElement ? {
                        title: titleElement.textContent.trim(),
                        artist: artistElement.textContent.trim()
                    } : null;
                    await download(`track/${id}`, trackInfo, this);
                } else {
                    const playlistInfo = getPlaylistInfo();
                    await download(`playlist/${id}`, playlistInfo, this);
                }
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
