// ==UserScript==
// @name         Spotify Enhancer (Cover Art Bulk Downloader)
// @description  Integrates a download button in Spotify Web Player for bulk album cover art downloads.
// @icon         https://raw.githubusercontent.com/exyezed/spotify-enhancer/refs/heads/main/extras/spotify-enhancer.png
// @version      1.3
// @author       exyezed
// @namespace    https://github.com/exyezed/spotify-enhancer/
// @supportURL   https://github.com/exyezed/spotify-enhancer/issues
// @license      MIT
// @match        https://open.spotify.com/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @require      https://cdnjs.cloudflare.com/ajax/libs/jszip/3.7.1/jszip.min.js
// @connect      exyezed.vercel.app
// @connect      i.scdn.co
// ==/UserScript==

(function() {
    'use strict';

    const IMAGE_RESOLUTIONS = {
        FULL_SIZE: 'ab67616d000082c1',
        NORMAL: 'ab67616d0000b273'
    };

    const CONFIG = {
        useFullSize: GM_getValue('useFullSize', 0)
    };

    const ICONS = {
        toggleOn: `<svg xmlns="http://www.w3.org/2000/svg" height="32px" viewBox="0 -960 960 960" width="32px"><path d="M280-240q-100 0-170-70T40-480q0-100 70-170t170-70h400q100 0 170 70t70 170q0 100-70 170t-170 70H280Zm0-80h400q66 0 113-47t47-113q0-66-47-113t-113-47H280q-66 0-113 47t-47 113q0 66 47 113t113 47Zm400-40q50 0 85-35t35-85q0-50-35-85t-85-35q-50 0-85 35t-35 85q0 50 35 85t85 35ZM480-480Z"/></svg>`,
        toggleOff: `<svg xmlns="http://www.w3.org/2000/svg" height="32px" viewBox="0 -960 960 960" width="32px"><path d="M280-240q-100 0-170-70T40-480q0-100 70-170t170-70h400q100 0 170 70t70 170q0 100-70 170t-170 70H280Zm0-80h400q66 0 113-47t47-113q0-66-47-113t-113-47H280q-66 0-113 47t-47 113q0 66 47 113t113 47Zm0-40q50 0 85-35t35-85q0-50-35-85t-85-35q-50 0-85 35t-35 85q0 50 35 85t85 35Zm200-120Z"/></svg>`,
        spinner: `<svg xmlns="http://www.w3.org/2000/svg" width="32px" height="32px" viewBox="0 0 24 24"><path fill="currentColor" d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,20a9,9,0,1,1,9-9A9,9,0,0,1,12,21Z"/><rect width="2" height="7" x="11" y="6" fill="currentColor" rx="1"><animateTransform attributeName="transform" dur="9s" repeatCount="indefinite" type="rotate" values="0 12 12;360 12 12"/></rect><rect width="2" height="9" x="11" y="11" fill="currentColor" rx="1"><animateTransform attributeName="transform" dur="0.75s" repeatCount="indefinite" type="rotate" values="0 12 12;360 12 12"/></rect></svg>`
    };

    function getModifiedImageUrl(originalUrl) {
        const targetResolution = CONFIG.useFullSize ? IMAGE_RESOLUTIONS.FULL_SIZE : IMAGE_RESOLUTIONS.NORMAL;
        return originalUrl.replace(/ab67616d0000b273|ab67616d000082c1/, targetResolution);
    }

    GM_addStyle(`
        :root {
            --spotify-font-stack: SpotifyMixUI,CircularSp-Arab,CircularSp-Hebr,CircularSp-Cyrl,CircularSp-Grek,CircularSp-Deva,var(--fallback-fonts,sans-serif);
            --spotify-title-font-stack: SpotifyMixUITitle,CircularSp-Arab,CircularSp-Hebr,CircularSp-Cyrl,CircularSp-Grek,CircularSp-Deva,var(--fallback-fonts,sans-serif);
        }

        .download-button {
            background: transparent;
            border: none;
            color: #b3b3b3;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 52px;
            min-height: 52px;
            margin: 0;
            padding: 0;
            font-family: var(--spotify-font-stack);
            transition: color 0.2s ease;
        }
        
        .download-button.loading {
            pointer-events: none;
            opacity: 1;
        }

        .download-button:hover {
            color: #fff;
        }

        .download-button .IconWrapper {
            width: 52px;
            height: 52px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .download-button svg {
            width: 32px;
            height: 32px;
        }

        .download-button svg path {
            fill: currentColor;
        }

        .resolution-toggle {
            background: transparent;
            border: none;
            color: #b3b3b3;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 52px;
            min-height: 52px;
            margin: 0 0 0 -18px;
            padding: 0;
            font-family: var(--spotify-font-stack);
            transition: color 0.2s ease;
        }

        .resolution-toggle:hover {
            color: #fff;
        }

        .resolution-toggle .IconWrapper {
            width: 52px;
            height: 52px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .resolution-toggle svg {
            width: 32px;
            height: 32px;
        }

        .resolution-toggle svg path {
            fill: currentColor;
        }

        .resolution-toggle.active {
            color: #1db954;
        }

        .resolution-toggle.active:hover {
            color: #1ed760;
        }

        .download-progress-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            color: white;
            font-family: var(--spotify-font-stack);
        }

        .progress-container {
            width: 300px;
            background: #282828;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            text-align: center;
        }

        .progress-title {
            text-align: center;
            margin-bottom: 15px;
            font-size: 16px;
            font-family: var(--spotify-title-font-stack);
            font-weight: 700;
            letter-spacing: -0.04em;
        }

        .progress-bar {
            width: 100%;
            height: 4px;
            background: #404040;
            border-radius: 2px;
            overflow: hidden;
            margin-bottom: 10px;
        }

        .progress-fill {
            height: 100%;
            background: #1db954;
            width: 0%;
            transition: width 0.2s ease;
        }

        .progress-status {
            text-align: center;
            font-size: 14px;
            color: #b3b3b3;
            font-family: var(--spotify-font-stack);
            margin-bottom: 15px;
        }

        .cancel-button {
            background: transparent;
            border: 1px solid #b3b3b3;
            color: #b3b3b3;
            padding: 8px 16px;
            border-radius: 20px;
            cursor: pointer;
            font-size: 14px;
            font-family: var(--spotify-font-stack);
            font-weight: 700;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            transition: all 0.2s ease;
            width: fit-content;
            margin: 0 auto;
            display: block;
        }

        .cancel-button:hover {
            border-color: white;
            color: white;
            transform: scale(1.04);
        }
    `);

    function createProgressOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'download-progress-overlay';
        overlay.innerHTML = `
            <div class="progress-container">
                <div class="progress-title">Downloading Cover Art</div>
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
                <div class="progress-status">Preparing download...</div>
                <button class="cancel-button">Cancel</button>
            </div>
        `;
        return overlay;
    }

    function updateProgress(overlay, current, total, status) {
        const progressFill = overlay.querySelector('.progress-fill');
        const progressStatus = overlay.querySelector('.progress-status');
        const percentage = (current / total) * 100;

        progressFill.style.width = `${percentage}%`;
        progressStatus.textContent = status || `Downloading ${current} of ${total} cover arts`;
    }

    function getPlaylistId() {
        const match = window.location.pathname.match(/\/playlist\/([a-zA-Z0-9]+)/);
        return match ? match[1] : null;
    }

    async function fetchCoverData(playlistId) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: `https://exyezed.vercel.app/api/playlist/${playlistId}`,
                onload: function(response) {
                    try {
                        const data = JSON.parse(response.responseText);
                        resolve(data);
                    } catch (error) {
                        reject(error);
                    }
                },
                onerror: reject
            });
        });
    }

    async function fetchImageAsBlob(url) {
        const modifiedUrl = getModifiedImageUrl(url);
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: modifiedUrl,
                responseType: 'blob',
                onload: function(response) {
                    resolve(response.response);
                },
                onerror: reject
            });
        });
    }

    function sanitizeFilename(filename) {
        return filename.replace(/[/\\?%*:|"<>]/g, '-');
    }

    let abortDownload = false;

    async function downloadCover() {
        let overlay = null;
        try {
            const playlistId = getPlaylistId();
            if (!playlistId) {
                alert('Could not find playlist ID');
                return;
            }

            abortDownload = false;

            const button = document.querySelector('.download-button');
            if (button) {
                button.classList.add('loading');
                const iconWrapper = button.querySelector('.IconWrapper');
                if (iconWrapper) {
                    iconWrapper.innerHTML = ICONS.spinner;
                }
            }

            const coverData = await fetchCoverData(playlistId);

            if (button) {
                button.classList.remove('loading');
                const iconWrapper = button.querySelector('.IconWrapper');
                if (iconWrapper) {
                    iconWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="32px" viewBox="0 -960 960 960" width="32px">
                        <path d="M360-400h400L622-580l-92 120-62-80-108 140Zm-40 160q-33 0-56.5-23.5T240-320v-480q0-33 23.5-56.5T320-880h480q33 0 56.5 23.5T880-800v480q0-33-23.5 56.5T800-240H320Zm0-80h480v-480H320v480ZM160-80q-33 0-56.5-23.5T80-160v-560h80v560h560v80H160Zm160-720v480-480Z"/>
                    </svg>`;
                }
            }

            overlay = createProgressOverlay();
            document.body.appendChild(overlay);

            overlay.querySelector('.cancel-button').addEventListener('click', () => {
                abortDownload = true;
                updateProgress(overlay, 0, 0, 'Cancelling download...');
            });

            const zip = new JSZip();
            const total = coverData.track_list.length;

            for (let i = 0; i < total; i++) {
                if (abortDownload) {
                    throw new Error('Download cancelled by user');
                }

                const track = coverData.track_list[i];
                try {
                    updateProgress(overlay, i + 1, total);
                    const imageBlob = await fetchImageAsBlob(track.cover);
                    const filename = sanitizeFilename(`${track.title} - ${track.artists}.jpeg`);
                    zip.file(filename, imageBlob);
                } catch (error) {
                    console.error(`Failed to download cover art for ${track.title}:`, error);
                }
            }

            updateProgress(overlay, total, total, 'Creating ZIP file...');
            const zipBlob = await zip.generateAsync({type: 'blob'});

            const zipUrl = URL.createObjectURL(zipBlob);
            const downloadLink = document.createElement('a');
            downloadLink.href = zipUrl;
            downloadLink.download = sanitizeFilename(`${coverData.cover_title}.zip`);
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            URL.revokeObjectURL(zipUrl);

            document.body.removeChild(overlay);

        } catch (error) {
            console.error('Error downloading cover art:', error);
            if (!abortDownload) {
                alert('Failed to download cover art. Please try again.');
            }
            if (overlay) {
                document.body.removeChild(overlay);
            }
            const button = document.querySelector('.download-button');
            if (button) {
                button.classList.remove('loading');
                const iconWrapper = button.querySelector('.IconWrapper');
                if (iconWrapper) {
                    iconWrapper.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="32px" viewBox="0 -960 960 960" width="32px">
                        <path d="M360-400h400L622-580l-92 120-62-80-108 140Zm-40 160q-33 0-56.5-23.5T240-320v-480q0-33 23.5-56.5T320-880h480q33 0 56.5 23.5T880-800v480q0-33-23.5 56.5T800-240H320Zm0-80h480v-480H320v480ZM160-80q-33 0-56.5-23.5T80-160v-560h80v560h560v80H160Zm160-720v480-480Z"/>
                    </svg>`;
                }
            }
        }
    }

    function createDownloadButton() {
        const button = document.createElement('button');
        button.className = 'Button-sc-1dqy6lx-0 dbhFGF download-button';
        button.setAttribute('aria-label', 'Download All Cover Art');
        button.setAttribute('title', 'Download All Cover Art');
        button.setAttribute('data-encore-id', 'buttonTertiary');
    
        button.innerHTML = `
            <span class="IconWrapper" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" height="32px" viewBox="0 -960 960 960" width="32px">
                    <path d="M360-400h400L622-580l-92 120-62-80-108 140Zm-40 160q-33 0-56.5-23.5T240-320v-480q0-33 23.5-56.5T320-880h480q33 0 56.5 23.5T880-800v480q0-33-23.5 56.5T800-240H320Zm0-80h480v-480H320v480ZM160-80q-33 0-56.5-23.5T80-160v-560h80v560h560v80H160Zm160-720v480-480Z"/>
                </svg>
            </span>
        `;
    
        button.addEventListener('click', downloadCover);
        return button;
    }

    function createResolutionToggle() {
        const button = document.createElement('button');
        button.className = `resolution-toggle ${CONFIG.useFullSize ? 'active' : ''}`;
        button.setAttribute('aria-label', 'Toggle High Resolution');
        button.setAttribute('title', 'High Resolution (2000x2000)');
        button.setAttribute('data-encore-id', 'buttonTertiary');

        button.innerHTML = `
            <span class="IconWrapper" aria-hidden="true">
                ${CONFIG.useFullSize ? ICONS.toggleOn : ICONS.toggleOff}
            </span>
        `;

        button.addEventListener('click', () => {
            CONFIG.useFullSize = !CONFIG.useFullSize;
            GM_setValue('useFullSize', CONFIG.useFullSize);
            button.classList.toggle('active');
            button.querySelector('.IconWrapper').innerHTML = CONFIG.useFullSize ? ICONS.toggleOn : ICONS.toggleOff;
        });

        return button;
    }

    function waitForElement(selector, timeout = 5000) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(selector)) {
                return resolve(document.querySelector(selector));
            }

            const observer = new MutationObserver((mutations) => {
                if (document.querySelector(selector)) {
                    observer.disconnect();
                    resolve(document.querySelector(selector));
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Timeout waiting for element: ${selector}`));
            }, timeout);
        });
    }

    async function addButtons() {
        if (!window.location.pathname.startsWith('/playlist/')) {
            return;
        }

        try {
            const actionBar = await waitForElement('[data-testid="action-bar-row"]');
            const moreButton = await waitForElement('[data-testid="more-button"]');

            if (!actionBar.querySelector('.download-button')) {
                const downloadButton = createDownloadButton();
                if (downloadButton) {
                    moreButton.parentNode.insertBefore(downloadButton, moreButton.nextSibling);
                }
            }

            if (!actionBar.querySelector('.resolution-toggle')) {
                const resolutionToggle = createResolutionToggle();
                if (resolutionToggle) {
                    const downloadButton = actionBar.querySelector('.download-button');
                    if (downloadButton) {
                        downloadButton.parentNode.insertBefore(resolutionToggle, downloadButton.nextSibling);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to add buttons:', error);
            setTimeout(() => addButtons(), 1000);
        }
    }

    function handleRouteChange() {
        if (!window.location.pathname.startsWith('/playlist/')) {
            const existingButtons = document.querySelectorAll('.download-button, .resolution-toggle');
            existingButtons.forEach(button => button.remove());
            return;
        }

        addButtons();
    }

    function init() {
        handleRouteChange();

        const pushState = history.pushState;
        const replaceState = history.replaceState;

        history.pushState = function() {
            pushState.apply(history, arguments);
            handleRouteChange();
        };

        history.replaceState = function() {
            replaceState.apply(history, arguments);
            handleRouteChange();
        };

        window.addEventListener('popstate', handleRouteChange);

        const observer = new MutationObserver((mutations) => {
            if (window.location.pathname.startsWith('/playlist/')) {
                const actionBar = document.querySelector('[data-testid="action-bar-row"]');
                const hasButtons = document.querySelector('.download-button');
                
                if (actionBar && !hasButtons) {
                    addButtons();
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
