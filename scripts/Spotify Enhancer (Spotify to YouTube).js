// ==UserScript==
// @name         Spotify Enhancer (Spotify to YouTube)
// @description  Easily find and open YouTube videos for any Spotify track with a single click.
// @icon         https://raw.githubusercontent.com/exyezed/spotify-enhancer/refs/heads/main/extras/spotify-enhancer.png
// @version      1.2
// @author       exyezed
// @namespace    https://github.com/exyezed/spotify-enhancer/
// @supportURL   https://github.com/exyezed/spotify-enhancer/issues
// @license      MIT
// @match        https://open.spotify.com/*
// @grant        GM_openInTab
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
    'use strict';

    const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000;

    const spinnerSVG = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" class="spinner-icon" style="
        width: 36px;
        height: 36px;
        margin-left: 15px;
        vertical-align: middle;
        cursor: pointer;
        transition: transform 0.2s ease;
        display: none;
        ">
        <defs>
            <style>.fa-secondary{opacity:.4}</style>
        </defs>
        <path class="fa-secondary" fill="#FFFFFF" d="M0 256C0 114.9 114.1 .5 255.1 0C237.9 .5 224 14.6 224 32c0 17.7 14.3 32 32 32C150 64 64 150 64 256s86 192 192 192c69.7 0 130.7-37.1 164.5-92.6c-3 6.6-3.3 14.8-1 22.2c1.2 3.7 3 7.2 5.4 10.3c1.2 1.5 2.6 3 4.1 4.3c.8 .7 1.6 1.3 2.4 1.9c.4 .3 .8 .6 1.3 .9s.9 .6 1.3 .8c5 2.9 10.6 4.3 16 4.3c11 0 21.8-5.7 27.7-16c-44.3 76.5-127 128-221.7 128C114.6 512 0 397.4 0 256z"/>
        <path class="fa-primary" fill="#FFFFFF" d="M224 32c0-17.7 14.3-32 32-32C397.4 0 512 114.6 512 256c0 46.6-12.5 90.4-34.3 128c-8.8 15.3-28.4 20.5-43.7 11.7s-20.5-28.4-11.7-43.7c16.3-28.2 25.7-61 25.7-96c0-106-86-192-192-192c-17.7 0-32-14.3-32-32z"/>
        </svg>
    `;
    
    const youtubeIconSVG = `
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" class="youtube-icon" style="
        margin-left: 10px;
        vertical-align: middle;
        cursor: pointer;
        transition: transform 0.2s ease;
        ">
        <path fill="#FF0033" d="M21.58,7.19c-0.23-0.86-0.91-1.54-1.77-1.77C18.25,5,12,5,12,5S5.75,5,4.19,5.42C3.33,5.65,2.65,6.33,2.42,7.19C2,8.75,2,12,2,12s0,3.25,0.42,4.81c0.23,0.86,0.91,1.54,1.77,1.77C5.75,19,12,19,12,19s6.25,0,7.81-0.42c0.86-0.23,1.54-0.91,1.77-1.77C22,15.25,22,12,22,12S22,8.75,21.58,7.19z"/>
        <polygon fill="#FFFFFF" points="10,15 15,12 10,9"/>
        </svg>
    `;

    function insertSVGIconNextToH1() {
        if (!window.location.href.includes('/track/')) {
            return;
        }

        const h1Elements = document.querySelectorAll('h1');
        
        const iconContainer = document.createElement('div');
        iconContainer.style.display = 'inline-block';
        iconContainer.style.position = 'relative';
        
        
        h1Elements.forEach(h1 => {
            if (!h1.querySelector('.youtube-icon')) {
                iconContainer.innerHTML = youtubeIconSVG + spinnerSVG;
                
                const youtubeIcon = iconContainer.querySelector('.youtube-icon');
                const spinnerIcon = iconContainer.querySelector('.spinner-icon');
                
                const styleTag = document.createElement('style');
                styleTag.textContent = `
                  .youtube-icon:hover, .spinner-icon:hover {
                    transform: scale(1.1);
                  }
                  @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                  }
                  .spinner-icon {
                    animation: spin 1s linear infinite;
                  }
                `;
                document.head.appendChild(styleTag);
                
                const trackId = extractTrackId();
                
                youtubeIcon.addEventListener('click', () => {
                    youtubeIcon.style.display = 'none';
                    spinnerIcon.style.display = 'inline-block';
                    fetchYouTubeLink(trackId, youtubeIcon, spinnerIcon);
                });
                
                h1.appendChild(iconContainer);
            }
        });
    }
    
    function extractTrackId() {
        const urlMatch = window.location.href.match(/track\/([a-zA-Z0-9]+)/);
        return urlMatch ? urlMatch[1] : null;
    }
    
    function fetchYouTubeLink(trackId, youtubeIcon, spinnerIcon) {
        if (!trackId) {
            console.error('No track ID found');
            return;
        }
        
        const cachedData = GM_getValue(`youtube_link_${trackId}`);
        
        if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_DURATION) {
            GM_openInTab(cachedData.youtube_url, { active: true });
            youtubeIcon.style.display = 'inline-block';
            spinnerIcon.style.display = 'none';
            return;
        }
        
        fetch(`https://spotapis.vercel.app/track/${trackId}`)
            .then(response => response.json())
            .then(data => {
                if (data.youtube_url) {
                    GM_setValue(`youtube_link_${trackId}`, {
                        youtube_url: data.youtube_url,
                        timestamp: Date.now()
                    });
                    GM_openInTab(data.youtube_url, { active: true });
                } else {
                    console.error('No YouTube URL found');
                }
            })
            .catch(error => {
                console.error('Error fetching YouTube link:', error);
            })
            .finally(() => {
                youtubeIcon.style.display = 'inline-block';
                spinnerIcon.style.display = 'none';
            });
    }
    
    function removeYouTubeIcon() {
        const iconContainer = document.querySelector('.youtube-icon').parentNode;
        if (iconContainer) {
            iconContainer.remove();
        }
    }

    function handleURLChange() {
        removeYouTubeIcon();
        insertSVGIconNextToH1();
    }

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.addedNodes.length) {
                insertSVGIconNextToH1();
            }
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    const urlObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                handleURLChange();
            }
        });
    });

    urlObserver.observe(document.querySelector('title'), {
        subtree: true,
        characterData: true,
        childList: true
    });
    
    insertSVGIconNextToH1();
    console.log('Spotify Enhancer (Spotify to YouTube) is running');
})();
