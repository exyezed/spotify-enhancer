// ==UserScript==
// @name         Spotify Enhancer (Clickable Playlist Tracks)
// @description  Makes individual track titles clickable in Spotify playlists for quick access in list mode.
// @icon         https://raw.githubusercontent.com/exyezed/spotify-enhancer/refs/heads/main/extras/spotify-enhancer.png
// @version      1.0
// @author       exyezed
// @namespace    https://github.com/exyezed/spotify-enhancer/
// @supportURL   https://github.com/exyezed/spotify-enhancer/issues
// @license      MIT
// @match        https://open.spotify.com/playlist/*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    const COLORS = {
        default: '#b3b3b3',
        active: '#1ed760',
        hover: '#2bfc77'
    };

    let trackDataMap = new Map();

    function getPlaylistId() {
        const pathname = window.location.pathname;
        const matches = pathname.match(/\/playlist\/([a-zA-Z0-9]+)/);
        return matches ? matches[1] : null;
    }

    async function fetchTrackData(playlistId) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: `https://exyezed.vercel.app/api/cover/${playlistId}`,
                onload: function(response) {
                    try {
                        const data = JSON.parse(response.responseText);
                        const trackMap = new Map(
                            data.track_list.map(track => [track.title, track])
                        );
                        resolve(trackMap);
                    } catch (error) {
                        reject(error);
                    }
                },
                onerror: function(error) {
                    reject(error);
                }
            });
        });
    }

    function makeClickable(element) {
        if (element.hasAttribute('data-processed')) return;
        
        const titleText = element.textContent.trim();
        const link = document.createElement('a');
        link.href = '#';
        link.textContent = titleText;
        link.style.textDecoration = 'none';
        link.style.color = COLORS.default;
        link.style.transition = 'color 0.2s ease';
        link.classList.add('spotify-track-link');
        link.setAttribute('data-title', titleText);
        
        link.addEventListener('mouseover', () => {
            if (!trackDataMap.get(titleText)) {
                link.style.cursor = 'default';
            }
        });
        
        link.addEventListener('click', (e) => {
            if (!trackDataMap.get(titleText)) {
                e.preventDefault();
                return;
            }
        });

        element.textContent = '';
        element.appendChild(link);
        element.setAttribute('data-processed', 'true');

        const existingTrackData = trackDataMap.get(titleText);
        if (existingTrackData) {
            updateSingleLink(link, existingTrackData);
        }
    }

    function updateSingleLink(link, trackData) {
        link.href = `https://open.spotify.com/track/${trackData.id}`;
        link.target = '_blank';
        link.style.color = COLORS.active;
        link.style.cursor = 'pointer';
        
        link.addEventListener('mouseover', () => {
            link.style.color = COLORS.hover;
        });
        
        link.addEventListener('mouseout', () => {
            link.style.color = COLORS.active;
        });
    }

    function updateLinks(trackMap) {
        trackDataMap = trackMap;
        document.querySelectorAll('.spotify-track-link').forEach(link => {
            const titleText = link.getAttribute('data-title');
            const trackData = trackMap.get(titleText);
            if (trackData) {
                updateSingleLink(link, trackData);
            }
        });
    }

    function processNewElements(mutations) {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) {
                    if (node.matches?.('div[data-encore-id="text"].encore-text-body-medium')) {
                        makeClickable(node);
                    }
                    node.querySelectorAll?.('div[data-encore-id="text"].encore-text-body-medium').forEach(element => {
                        makeClickable(element);
                    });
                }
            });
        });
    }

    async function init() {
        document.querySelectorAll('div[data-encore-id="text"].encore-text-body-medium').forEach(makeClickable);

        const observer = new MutationObserver(processNewElements);
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        const playlistId = getPlaylistId();
        if (playlistId) {
            try {
                const trackMap = await fetchTrackData(playlistId);
                updateLinks(trackMap);
            } catch (error) {
                console.error('Error fetching track data:', error);
            }
        }
    }

    window.addEventListener('load', init);
    
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            trackDataMap.clear();
            init();
        }
    }).observe(document, { subtree: true, childList: true });

})();
