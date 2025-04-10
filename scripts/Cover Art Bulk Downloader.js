// ==UserScript==
// @name         Spotify Enhancer (Cover Art Bulk Downloader)
// @description  Add a button to download multiple cover arts at once.
// @icon         https://raw.githubusercontent.com/exyezed/spotify-enhancer/refs/heads/main/extras/spotify-enhancer.png
// @version      2.4
// @author       exyezed
// @namespace    https://github.com/exyezed/spotify-enhancer/
// @supportURL   https://github.com/exyezed/spotify-enhancer/issues
// @license      MIT
// @match        https://open.spotify.com/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @require      https://cdn.jsdelivr.net/npm/jszip@3.7.1/dist/jszip.min.js
// @connect      i.scdn.co
// ==/UserScript==

(function() {
    'use strict';

    const IMAGE_RESOLUTIONS = {
        SMALL: 'ab67616d00004851',
        MEDIUM: 'ab67616d00001e02',
        LARGE: 'ab67616d0000b273',
        ORIGINAL: 'ab67616d000082c1'
    };

    const CONFIG = {
        selectedSize: GM_getValue('selectedSize', 'MEDIUM')
    };

    const ICONS = {
        coverSize: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M21.73682,3.751,19.31689,1.33105a.99964.99964,0,0,0-1.41406,0L13.32275,5.91113a1.00013,1.00013,0,0,0-.293.707V9.03809a1.00005,1.00005,0,0,0,1,1H16.4502a1.00014,1.00014,0,0,0,.707-.293L21.73682,5.165A.99964.99964,0,0,0,21.73682,3.751ZM16.03613,8.03809H15.02979V7.03223l3.58007-3.58008L19.61572,4.458ZM19,11a1,1,0,0,0-1,1v2.3916l-1.48047-1.48047a2.78039,2.78039,0,0,0-3.92822,0l-.698.698L9.40723,11.123a2.777,2.777,0,0,0-3.92432,0L4,12.606V7A1.0013,1.0013,0,0,1,5,6h6a1,1,0,0,0,0-2H5A3.00328,3.00328,0,0,0,2,7V19a3.00328,3.00328,0,0,0,3,3H17a3.00328,3.00328,0,0,0,3-3V12A1,1,0,0,0,19,11ZM5,20a1.0013,1.0013,0,0,1-1-1V15.43408l2.897-2.897a.79926.79926,0,0,1,1.09619,0l3.168,3.16711c.00849.00916.0116.02179.02045.03064L15.44714,20Zm13-1a.97137.97137,0,0,1-.17877.53705l-4.51386-4.51386.698-.698a.77979.77979,0,0,1,1.1001,0L18,17.21973Z"></path></svg>`,
        spinner: `<svg xmlns="http://www.w3.org/2000/svg" width="32px" height="32px" viewBox="0 0 24 24"><path fill="currentColor" d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,20a9,9,0,1,1,9-9A9,9,0,0,1,12,21Z"/><rect width="2" height="7" x="11" y="6" fill="currentColor" rx="1"><animateTransform attributeName="transform" dur="9s" repeatCount="indefinite" type="rotate" values="0 12 12;360 12 12"/></rect><rect width="2" height="9" x="11" y="11" fill="currentColor" rx="1"><animateTransform attributeName="transform" dur="0.75s" repeatCount="indefinite" type="rotate" values="0 12 12;360 12 12"/></rect></svg>`,
        download: `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" stroke-width="0.00024000000000000003"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M22.71,6.29a1,1,0,0,0-1.42,0L20,7.59V2a1,1,0,0,0-2,0V7.59l-1.29-1.3a1,1,0,0,0-1.42,1.42l3,3a1,1,0,0,0,.33.21.94.94,0,0,0,.76,0,1,1,0,0,0,.33-.21l3-3A1,1,0,0,0,22.71,6.29ZM19,13a1,1,0,0,0-1,1v.38L16.52,12.9a2.79,2.79,0,0,0-3.93,0l-.7.7L9.41,11.12a2.85,2.85,0,0,0-3.93,0L4,12.6V7A1,1,0,0,1,5,6h8a1,1,0,0,0,0-2H5A3,3,0,0,0,2,7V19a3,3,0,0,0,3,3H17a3,3,0,0,0,3-3V14A1,1,0,0,0,19,13ZM5,20a1,1,0,0,1-1-1V15.43l2.9-2.9a.79.79,0,0,1,1.09,0l3.17,3.17,0,0L15.46,20Zm13-1a.89.89,0,0,1-.18.53L13.31,15l.7-.7a.77.77,0,0,1,1.1,0L18,17.21Z"></path></g></svg>`
    };

    function createElementSafe(tag, attributes = {}, children = []) {
        const element = document.createElement(tag);
        for (const [key, value] of Object.entries(attributes)) {
            if (key === 'className') {
                element.className = value;
            } else {
                element.setAttribute(key, value);
            }
        }
        children.forEach(child => {
            if (typeof child === 'string') {
                element.appendChild(document.createTextNode(child));
            } else {
                element.appendChild(child);
            }
        });
        return element;
    }

    function createSVGSafe(svgString) {
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
        return svgDoc.documentElement;
    }

    function getModifiedImageUrl(originalUrl) {
        return originalUrl.replace(/ab67616d00001e02|ab67616d000082c1|ab67616d00004851|ab67616d0000b273/, IMAGE_RESOLUTIONS[CONFIG.selectedSize]);
    }

    function sanitizeFilename(filename) {
        return filename.replace(/[/\\?%*:|"<>]/g, '-');
    }

    function createCoverSizeButton() {
        const button = createElementSafe('button', {
            className: 'Button-sc-1dqy6lx-0 dbhFGF cover-size-button',
            'aria-label': 'Cover Size Options',
            title: 'Cover Size Options',
            'data-encore-id': 'buttonTertiary'
        });
    
        const iconWrapper = createElementSafe('span', {
            className: 'IconWrapper',
            'aria-hidden': 'true'
        });
    
        const backdrop = createElementSafe('div', {
            className: 'size-dropdown-backdrop'
        });
        document.body.appendChild(backdrop);
    
        const dropdown = createElementSafe('div', {
            className: 'size-dropdown'
        });

        document.body.appendChild(dropdown);
    
        const sizeOptions = [
            { id: 'SMALL', label: '64px', description: 'Small' },
            { id: 'MEDIUM', label: '300px', description: 'Medium' },
            { id: 'LARGE', label: '640px', description: 'Large' },
            { id: 'ORIGINAL', label: '2000px', description: 'Original' }
        ];
    
        sizeOptions.forEach(option => {
            const sizeOption = createElementSafe('div', {
                className: `size-option ${CONFIG.selectedSize === option.id ? 'selected' : ''}`,
                'data-size': option.id
            }, [
                option.description,
                createElementSafe('span', { className: 'size-label' }, [option.label])
            ]);
    
            sizeOption.addEventListener('click', (e) => {
                e.stopPropagation();
                CONFIG.selectedSize = option.id;
                GM_setValue('selectedSize', option.id);
                
                dropdown.querySelectorAll('.size-option').forEach(opt => {
                    opt.classList.toggle('selected', opt.dataset.size === option.id);
                });
                
                hideDropdown();
            });
    
            dropdown.appendChild(sizeOption);
        });
    
        iconWrapper.appendChild(createSVGSafe(ICONS.coverSize));
        button.appendChild(iconWrapper);
    
        function showDropdown() {
            const buttonRect = button.getBoundingClientRect();
            dropdown.style.top = `${buttonRect.bottom + 10}px`;
            dropdown.style.left = `${buttonRect.left}px`;
            dropdown.classList.add('active');
            backdrop.classList.add('active');
          }
    
        function hideDropdown() {
            dropdown.classList.remove('active');
            backdrop.classList.remove('active');
        }
    
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            if (dropdown.classList.contains('active')) {
                hideDropdown();
            } else {
                showDropdown();
            }
        });
    
        backdrop.addEventListener('click', hideDropdown);
    
        return button;
    }

    function getSizeLabel(sizeCode) {
        const sizeLabels = {
          'SMALL': 'Small',
          'MEDIUM': 'Medium',
          'LARGE': 'Large',
          'ORIGINAL': 'Original'
        };
        return sizeLabels[sizeCode] || 'Medium';
    }

    function createProgressOverlay() {
        const overlay = createElementSafe('div', { className: 'download-progress-overlay' });
        const container = createElementSafe('div', { className: 'progress-container' });
        
        const title = createElementSafe('div', { className: 'progress-title' }, [`Downloading ${getSizeLabel(CONFIG.selectedSize)} Cover Art`]);
        const progressBar = createElementSafe('div', { className: 'progress-bar' });
        const progressFill = createElementSafe('div', { className: 'progress-fill' });
        const status = createElementSafe('div', { className: 'progress-status' }, ['Preparing download...']);
        const cancelButton = createElementSafe('button', { className: 'cancel-button' }, ['Cancel']);

        progressBar.appendChild(progressFill);
        container.appendChild(title);
        container.appendChild(progressBar);
        container.appendChild(status);
        container.appendChild(cancelButton);
        overlay.appendChild(container);

        return overlay;
    }

    function updateProgress(overlay, current, total, status) {
        const progressFill = overlay.querySelector('.progress-fill');
        const progressStatus = overlay.querySelector('.progress-status');
        const percentage = (current / total) * 100;

        progressFill.style.width = `${percentage}%`;
        progressStatus.textContent = status || `Downloading ${current} of ${total}`;
    }

    function createDownloadButton() {
        const button = createElementSafe('button', {
            className: 'Button-sc-1dqy6lx-0 dbhFGF download-button',
            'aria-label': 'Download All Cover Art',
            title: 'Download All Cover Art',
            'data-encore-id': 'buttonTertiary'
        });

        const iconWrapper = createElementSafe('span', {
            className: 'IconWrapper',
            'aria-hidden': 'true'
        });

        iconWrapper.appendChild(createSVGSafe(ICONS.download));

        button.appendChild(iconWrapper);
        button.addEventListener('click', downloadCover);
        return button;
    }

    function getPlaylistId() {
        const match = window.location.pathname.match(/\/playlist\/([a-zA-Z0-9]+)/);
        return match ? match[1] : null;
    }

    async function getSpotifyToken() {
        const resources = performance.getEntriesByType('resource');
        
        for (const resource of resources) {
            if (resource.name.includes('https://open.spotify.com/get_access_token')) {
                console.log('RESOURCE URL:', resource.name);
                
                try {
                    const response = await fetch(resource.name);
                    const data = await response.json();
                    
                    if (data && data.accessToken) {
                        console.log('ACCESS TOKEN:', data.accessToken);
                        return data.accessToken;
                    }
                } catch (error) {
                    console.error('Error fetching token:', error);
                }
            }
        }
        
        console.log('No Spotify token found in performance resources');
        return null;
    }
    
    async function getPlaylistInfo(playlistId, token) {
        try {
            const endpoint = `https://api.spotify.com/v1/playlists/${playlistId}`;
            
            const response = await fetch(endpoint, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const data = await response.json();
            return {
                name: data.name || 'Unknown Playlist',
                description: data.description || '',
                owner: data.owner ? data.owner.display_name : 'Unknown',
                followers: data.followers ? data.followers.total : 0,
                imageUrl: data.images && data.images.length > 0 ? data.images[0].url : null
            };
        } catch (error) {
            console.error('Error fetching playlist info:', error);
            return {
                name: 'Unknown Playlist',
                description: '',
                owner: 'Unknown',
                followers: 0,
                imageUrl: null
            };
        }
    }
    
    async function getAllTracks(playlistId, token) {
        try {
            if (!token) {
                if (confirm('Failed to get access token. Click OK to refresh the page.')) {
                    location.reload();
                }
                throw new Error('Failed to get access token');
            }
            
            const endpoint = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;
            
            let allItems = [];
            let nextUrl = endpoint;
            
            while (nextUrl) {
                const url = new URL(nextUrl);
                url.searchParams.set('limit', '50');
                
                const response = await fetch(url.toString(), {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    if (confirm(`Error fetching tracks: ${response.status}. Click OK to refresh the page.`)) {
                        location.reload();
                    }
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.items && Array.isArray(data.items)) {
                    allItems = [...allItems, ...data.items];
                }
                
                nextUrl = data.next;
            }
            
            return allItems;
        } catch (error) {
            console.error('Error fetching tracks:', error);
            return [];
        }
    }
    
    function processTrackDataForDownload(items) {
        return items.map((item) => {
            const track = item.track;
            
            if (!track) return {
                title: 'Unknown Track',
                artist: 'Unknown Artist',
                cover: null
            };
            
            let coverUrl = null;
            if (track.album && track.album.images && track.album.images.length > 0) {
                coverUrl = track.album.images[0].url;
            }
            
            return {
                title: track.name || 'Unknown Track',
                artist: track.artists ? track.artists.map(a => a.name).join(', ') : 'Unknown Artist',
                cover: coverUrl
            };
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
                    while (iconWrapper.firstChild) {
                        iconWrapper.removeChild(iconWrapper.firstChild);
                    }
                    iconWrapper.appendChild(createSVGSafe(ICONS.spinner));
                }
            }
    
            const token = await getSpotifyToken();
            if (!token) {
                if (confirm('Failed to get access token. Click OK to refresh the page.')) {
                    location.reload();
                }
                throw new Error('Failed to get access token');
            }
    
            const playlistInfo = await getPlaylistInfo(playlistId, token);
            const trackItems = await getAllTracks(playlistId, token);
            const processedTracks = processTrackDataForDownload(trackItems);
    
            if (button) {
                button.classList.remove('loading');
                const iconWrapper = button.querySelector('.IconWrapper');
                if (iconWrapper) {
                    while (iconWrapper.firstChild) {
                        iconWrapper.removeChild(iconWrapper.firstChild);
                    }
                    iconWrapper.appendChild(createSVGSafe(ICONS.download));
                }
            }
    
            overlay = createProgressOverlay();
            document.body.appendChild(overlay);
    
            overlay.querySelector('.cancel-button').addEventListener('click', () => {
                abortDownload = true;
                updateProgress(overlay, 0, 0, 'Cancelling download...');
            });
    
            const zip = new JSZip();
            const total = processedTracks.length;
    
            for (let i = 0; i < total; i++) {
                if (abortDownload) {
                    throw new Error('Download cancelled by user');
                }
    
                const track = processedTracks[i];
                try {
                    updateProgress(overlay, i + 1, total);
                    if (track.cover) {
                        const imageBlob = await fetchImageAsBlob(track.cover);
                        const filename = sanitizeFilename(`${track.title} - ${track.artist}.jpeg`);
                        zip.file(filename, imageBlob);
                    }
                } catch (error) {
                    console.error(`Failed to download cover art for ${track.title}:`, error);
                }
            }
    
            updateProgress(overlay, total, total, 'Creating ZIP file...');
            const zipBlob = await zip.generateAsync({type: 'blob'});
            
            const zipUrl = URL.createObjectURL(zipBlob);
            const downloadLink = document.createElement('a');
            downloadLink.href = zipUrl;
            
            const sizeLabels = {
                'SMALL': '(Small)',
                'MEDIUM': '(Medium)',
                'LARGE': '(Large)',
                'ORIGINAL': '(Original)'
            };
            const resolutionSuffix = sizeLabels[CONFIG.selectedSize];
            downloadLink.download = sanitizeFilename(`${playlistInfo.name} ${resolutionSuffix}.zip`);
            
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            URL.revokeObjectURL(zipUrl);
    
            document.body.removeChild(overlay);
    
        } catch (error) {
            console.error('Error downloading cover art:', error);
            if (!abortDownload) {
                alert('Failed to download cover art. Try refreshing the page.');
            }
            if (overlay) {
                document.body.removeChild(overlay);
            }
            const button = document.querySelector('.download-button');
            if (button) {
                button.classList.remove('loading');
                const iconWrapper = button.querySelector('.IconWrapper');
                if (iconWrapper) {
                    while (iconWrapper.firstChild) {
                        iconWrapper.removeChild(iconWrapper.firstChild);
                    }
                    iconWrapper.appendChild(createSVGSafe(ICONS.download));
                }
            }
        }
    }

    function waitForElement(selector, timeout = 5000) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(selector)) {
                return resolve(document.querySelector(selector));
            }

            const observer = new MutationObserver(() => {
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

            if (!actionBar.querySelector('.cover-size-button')) {
                const coverSizeButton = createCoverSizeButton();
                if (coverSizeButton) {
                    const downloadButton = actionBar.querySelector('.download-button');
                    if (downloadButton) {
                        downloadButton.parentNode.insertBefore(coverSizeButton, downloadButton.nextSibling);
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

        const observer = new MutationObserver(() => {
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
    
        .cover-size-button {
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
            position: relative;
        }
    
        .cover-size-button:hover {
            color: #fff;
        }
    
        .cover-size-button .IconWrapper {
            width: 52px;
            height: 52px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
    
        .cover-size-button svg {
            width: 32px;
            height: 32px;
        }
    
        .cover-size-button svg path {
            fill: currentColor;
        }
    
        .size-dropdown {
            position: fixed;
            background: #282828;
            border-radius: 4px;
            padding: 4px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            display: none;
            z-index: 9999;
            min-width: 160px;
            animation: dropdownFade 0.2s ease;
        }
    
        @keyframes dropdownFade {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
    
        .size-dropdown.active {
            display: block;
        }
    
        .size-dropdown-backdrop {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: transparent;
            z-index: 9998;
            display: none;
        }
    
        .size-dropdown-backdrop.active {
            display: block;
        }
    
        .size-option {
            padding: 12px 16px;
            color: #b3b3b3;
            font-size: 14px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: space-between;
            transition: all 0.2s ease;
        }
    
        .size-option:hover {
            background: #333;
            color: #fff;
        }
    
        .size-option.selected {
            color: #1db954;
            background: #333;
        }
    
        .size-option.selected:hover {
            color: #1ed760;
        }
    
        .size-label {
            margin-left: 12px;
            font-size: 12px;
            color: #686868;
            opacity: 0.8;
        }
    `);
})();
