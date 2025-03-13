// ==UserScript==
// @name         Spotify Enhancer (Copy Track Info, ID & Link)
// @description  Add a button to copy track info, ID, and link.
// @icon         https://raw.githubusercontent.com/exyezed/spotify-enhancer/refs/heads/main/extras/spotify-enhancer.png
// @version      1.4
// @author       exyezed
// @namespace    https://github.com/exyezed/spotify-enhancer/
// @supportURL   https://github.com/exyezed/spotify-enhancer/issues
// @license      MIT
// @match        https://open.spotify.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function() {
    'use strict';

    const createSVG = (path, viewBox = "0 0 384 512", width = "16", height = "16", style = "cursor: pointer; margin-left: 8px; fill: #b3b3b3; vertical-align: middle") => {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("viewBox", viewBox);
        svg.setAttribute("width", width);
        svg.setAttribute("height", height);
        svg.setAttribute("style", style);
        const pathElement = document.createElementNS("http://www.w3.org/2000/svg", "path");
        pathElement.setAttribute("d", path);
        svg.appendChild(pathElement);
        return svg;
    };

    const copyIcon = createSVG("M192 0c-41.8 0-77.4 26.7-90.5 64L64 64C28.7 64 0 92.7 0 128L0 448c0 35.3 28.7 64 64 64l256 0c35.3 0 64-28.7 64-64l0-320c0-35.3-28.7-64-64-64l-37.5 0C269.4 26.7 233.8 0 192 0zm0 64a32 32 0 1 1 0 64 32 32 0 1 1 0-64zM72 272a24 24 0 1 1 48 0 24 24 0 1 1 -48 0zm104-16l128 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-128 0c-8.8 0-16-7.2-16-16s7.2-16 16-16zM72 368a24 24 0 1 1 48 0 24 24 0 1 1 -48 0zm88 0c0-8.8 7.2-16 16-16l128 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-128 0c-8.8 0-16-7.2-16-16z");
    const successIcon = createSVG("M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z", "0 0 512 512", "16", "16", "cursor: pointer; margin-left: 8px; fill: #1ed760; vertical-align: middle");
    const errorIcon = createSVG("M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM175 175c9.4-9.4 24.6-9.4 33.9 0l47 47 47-47c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-47 47 47 47c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-47-47-47 47c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l47-47-47-47c-9.4-9.4-9.4-24.6 0-33.9z", "0 0 512 512", "16", "16", "cursor: pointer; margin-left: 8px; fill: #f3727f; vertical-align: middle");
    const trackIdIcon = createSVG("M48 256C48 141.1 141.1 48 256 48c63.1 0 119.6 28.1 157.8 72.5c8.6 10.1 23.8 11.2 33.8 2.6s11.2-23.8 2.6-33.8C403.3 34.6 333.7 0 256 0C114.6 0 0 114.6 0 256l0 40c0 13.3 10.7 24 24 24s24-10.7 24-24l0-40zm458.5-52.9c-2.7-13-15.5-21.3-28.4-18.5s-21.3 15.5-18.5 28.4c2.9 13.9 4.5 28.3 4.5 43.1l0 40c0 13.3 10.7 24 24 24s24-10.7 24-24l0-40c0-18.1-1.9-35.8-5.5-52.9zM256 80c-19 0-37.4 3-54.5 8.6c-15.2 5-18.7 23.7-8.3 35.9c7.1 8.3 18.8 10.8 29.4 7.9c10.6-2.9 21.8-4.4 33.4-4.4c70.7 0 128 57.3 128 128l0 24.9c0 25.2-1.5 50.3-4.4 75.3c-1.7 14.6 9.4 27.8 24.2 27.8c11.8 0 21.9-8.6 23.3-20.3c3.3-27.4 5-55 5-82.7l0-24.9c0-97.2-78.8-176-176-176zM150.7 148.7c-9.1-10.6-25.3-11.4-33.9-.4C93.7 178 80 215.4 80 256l0 24.9c0 24.2-2.6 48.4-7.8 71.9C68.8 368.4 80.1 384 96.1 384c10.5 0 19.9-7 22.2-17.3c6.4-28.1 9.7-56.8 9.7-85.8l0-24.9c0-27.2 8.5-52.4 22.9-73.1c7.2-10.4 8-24.6-.2-34.2zM256 160c-53 0-96 43-96 96l0 24.9c0 35.9-4.6 71.5-13.8 106.1c-3.8 14.3 6.7 29 21.5 29c9.5 0 17.9-6.2 20.4-15.4c10.5-39 15.9-79.2 15.9-119.7l0-24.9c0-28.7 23.3-52 52-52s52 23.3 52 52l0 24.9c0 36.3-3.5 72.4-10.4 107.9c-2.7 13.9 7.7 27.2 21.8 27.2c10.2 0 19-7 21-17c7.7-38.8 11.6-78.3 11.6-118.1l0-24.9c0-53-43-96-96-96zm24 96c0-13.3-10.7-24-24-24s-24 10.7-24 24l0 24.9c0 59.9-11 119.3-32.5 175.2l-5.9 15.3c-4.8 12.4 1.4 26.3 13.8 31s26.3-1.4 31-13.8l5.9-15.3C267.9 411.9 280 346.7 280 280.9l0-24.9z", "0 0 512 512", "16", "16", "margin-right: 8px; fill: #b3b3b3; vertical-align: middle");
    const trackLinkIcon = createSVG("M579.8 267.7c56.5-56.5 56.5-148 0-204.5c-50-50-128.8-56.5-186.3-15.4l-1.6 1.1c-14.4 10.3-17.7 30.3-7.4 44.6s30.3 17.7 44.6 7.4l1.6-1.1c32.1-22.9 76-19.3 103.8 8.6c31.5 31.5 31.5 82.5 0 114L422.3 334.8c-31.5 31.5-82.5 31.5-114 0c-27.9-27.9-31.5-71.8-8.6-103.8l1.1-1.6c10.3-14.4 6.9-34.4-7.4-44.6s-34.4-6.9-44.6 7.4l-1.1 1.6C206.5 251.2 213 330 263 380c56.5 56.5 148 56.5 204.5 0L579.8 267.7zM60.2 244.3c-56.5 56.5-56.5 148 0 204.5c50 50 128.8 56.5 186.3 15.4l1.6-1.1c14.4-10.3 17.7-30.3 7.4-44.6s-30.3-17.7-44.6-7.4l-1.6 1.1c-32.1 22.9-76 19.3-103.8-8.6C74 372 74 321 105.5 289.5L217.7 177.2c31.5-31.5 82.5-31.5 114 0c27.9 27.9 31.5 71.8 8.6 103.9l-1.1 1.6c-10.3 14.4-6.9 34.4 7.4 44.6s34.4 6.9 44.6-7.4l1.1-1.6C433.5 260.8 427 182 377 132c-56.5-56.5-148-56.5-204.5 0L60.2 244.3z", "0 0 640 512", "16", "16", "margin-right: 8px; fill: #b3b3b3; vertical-align: middle");
    const enabledIcon = createSVG("M384 128c70.7 0 128 57.3 128 128s-57.3 128-128 128H192c-70.7 0-128-57.3-128-128s57.3-128 128-128H384zM576 256c0-106-86-192-192-192H192C86 64 0 150 0 256S86 448 192 448H384c106 0 192-86 192-192zM384 352c53 0 96-43 96-96s-43-96-96-96s-96 43-96 96s43 96 96 96z", "0 0 576 512", "16", "16", "margin-right: 8px; fill: currentColor; vertical-align: middle");
    const disabledIcon = createSVG("M192 128c-70.7 0-128 57.3-128 128s57.3 128 128 128H384c70.7 0 128-57.3 128-128s-57.3-128-128-128H192zM0 256C0 150 86 64 192 64H384c106 0 192 86 192 192s-86 192-192 192H192C86 448 0 362 0 256zm192 96c53 0 96-43 96-96s-43-96-96-96s-96 43-96 96s43 96 96 96z", "0 0 576 512", "16", "16", "margin-right: 8px; fill: currentColor; vertical-align: middle");
    const titleIcon = createSVG("M498.7 6c8.3 6 13.3 15.7 13.3 26l0 64c0 13.8-8.8 26-21.9 30.4L416 151.1 416 432c0 44.2-50.1 80-112 80s-112-35.8-112-80s50.1-80 112-80c17.2 0 33.5 2.8 48 7.7L352 128l0-64c0-13.8 8.8-26 21.9-30.4l96-32C479.6-1.6 490.4 0 498.7 6zM32 64l224 0c17.7 0 32 14.3 32 32s-14.3 32-32 32L32 128C14.3 128 0 113.7 0 96S14.3 64 32 64zm0 128l224 0c17.7 0 32 14.3 32 32s-14.3 32-32 32L32 256c-17.7 0-32-14.3-32-32s14.3-32 32-32zm0 128l96 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-96 0c-17.7 0-32-14.3-32-32s14.3-32 32-32z", "0 0 512 512", "16", "16", "margin-right: 8px; fill: #b3b3b3; vertical-align: middle");
    const artistIcon = createSVG("M224 0a128 128 0 1 1  0 256A128 128 0 1 1 224 0zM178.3 304l91.4 0c36.3 0 70.1 10.9 98.3 29.5l0 51.6c-18 2.5-34.8 9.1-48.5 19.4c-17.6 13.2-31.5 34-31.5 59.5c0 19.1 7.7 35.4 18.9 48L29.7 512C13.3 512 0 498.7 0 482.3C0 383.8 79.8 304 178.3 304zM630 164.5c6.3 4.5 10 11.8 10 19.5l0 48 0 160c0 1.2-.1 2.4-.3 3.6c.2 1.5 .3 2.9 .3 4.4c0 26.5-28.7 48-64 48s-64-21.5-64-48s28.7-48 64-48c5.5 0 10.9 .5 16 1.5l0-88.2-144 48L448 464c0 26.5-28.7 48-64 48s-64-21.5-64-48s28.7-48 64-48c5.5 0 10.9 .5 16 1.5L400 296l0-48c0-10.3 6.6-19.5 16.4-22.8l192-64c7.3-2.4 15.4-1.2 21.6 3.3z", "0 0 640 512", "16", "16", "margin-right:  8px; fill: #b3b3b3; vertical-align: middle");
    const optionsIcon = createSVG("M0 96C0 78.3 14.3 64 32 64l384 0c17.7 0 32 14.3 32 32s-14.3 32-32 32L32 128C14.3 128 0 113.7 0 96zM0 256c0-17.7 14.3-32 32-32l384 0c17.7 0 32 14.3 32 32s-14.3 32-32 32L32 288c-17.7 0-32-14.3-32-32zM448 416c0 17.7-14.3 32-32 32L32 448c-17.7 0-32-14.3-32-32s14.3-32 32-32l384 0c17.7 0 32 14.3 32 32z", "0 0 448 512", "16", "16", "margin-right:  8px; fill: #b3b3b3; vertical-align: middle");


    const defaultSettings = {
        copyType: 'trackId',
        isEnabled: true
    };

    let settings = GM_getValue('spotifyCopySettings', defaultSettings);

    function removeCopyButtons() {
        const copyButtons = document.querySelectorAll('.copy-track-info-btn');
        copyButtons.forEach(button => button.remove());
    }

    function createMenuSeparator() {
        const separator = document.createElement('div');
        separator.style.height = '1px';
        separator.style.backgroundColor = '#404040';
        separator.style.margin = '8px 0';
        return separator;
    }

    function getTrackId(row) {
        const trackLink = row.querySelector('a[href^="/track/"]');
        if (trackLink) {
            const trackId = trackLink.getAttribute('href').split('/').pop();
            return {
                id: trackId,
                link: `https://open.spotify.com/track/${trackId}`
            };
        }
        return null;
    }

    function getTrackInfo(row) {
        let title, artist;

        if (window.location.href.startsWith("https://open.spotify.com/artist/")) {
            const titleElement = row.querySelector('div[data-testid="tracklist-row"] div[role="gridcell"]:nth-child(2)');
            const artistElement = document.querySelector('span[data-testid="entityTitle"] h1');

            title = titleElement ? titleElement.textContent.trim() : 'Title Not Found';
            artist = artistElement ? artistElement.textContent.trim() : 'Artist Not Found';
        } else {
            const titleElement = row.querySelector('div[data-encore-id="text"].standalone-ellipsis-one-line');
            const artistElement = row.querySelector('span.encore-text-body-small[data-encore-id="text"]');

            title = titleElement ? titleElement.childNodes[0].textContent.trim() : 'Title Not Found';
            const artists = artistElement ? Array.from(artistElement.querySelectorAll('a')).map(el => el.textContent.trim()) : [];
            artist = artists.length > 0 ? artists.join(', ') : 'Artist Not Found';
        }

        return {
            title,
            artist,
            titleFirst: `${title} - ${artist}`,
            artistFirst: `${artist} - ${title}`
        };
    }

    function addCopyButton() {
        if (!settings.isEnabled) return;
    
        const trackRows = document.querySelectorAll('[data-testid="tracklist-row"]');
        trackRows.forEach(row => {
            if (row.querySelector('.copy-track-info-btn')) return;
    
            const copyBtn = document.createElement('span');
            copyBtn.className = 'copy-track-info-btn';
            copyBtn.style.display = 'inline-flex';
            copyBtn.style.alignItems = 'center';
            copyBtn.appendChild(copyIcon.cloneNode(true));
    
            copyBtn.onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
    
                const trackInfo = getTrackInfo(row);
                let textToCopy;
                let isSuccess = true;
    
                switch (settings.copyType) {
                    case 'trackId':
                        const trackIdInfo = getTrackId(row);
                        if (trackIdInfo && trackIdInfo.id) {
                            textToCopy = trackIdInfo.id;
                        } else {
                            textToCopy = 'Track ID Not Found';
                            isSuccess = false;
                        }
                        break;
                    case 'trackLink':
                        const trackLinkInfo = getTrackId(row);
                        if (trackLinkInfo && trackLinkInfo.link) {
                            textToCopy = trackLinkInfo.link;
                        } else {
                            textToCopy = 'Track Link Not Found';
                            isSuccess = false;
                        }
                        break;
                    case 'titleFirst':
                        textToCopy = trackInfo.titleFirst;
                        break;
                    case 'artistFirst':
                        textToCopy = trackInfo.artistFirst;
                        break;
                    default:
                        textToCopy = 'Invalid copy type';
                        isSuccess = false;
                }
    
                navigator.clipboard.writeText(textToCopy).then(() => {
                    this.replaceChild(isSuccess ? successIcon.cloneNode(true) : errorIcon.cloneNode(true), this.firstChild);
                    setTimeout(() => {
                        this.replaceChild(copyIcon.cloneNode(true), this.firstChild);
                    }, 250);
                }).catch(() => {
                    this.replaceChild(errorIcon.cloneNode(true), this.firstChild);
                    setTimeout(() => {
                        this.replaceChild(copyIcon.cloneNode(true), this.firstChild);
                    }, 250);
                });
            };
    
            const compactContainer = row.querySelector('div[class="ft6dUifK4i03829TBAqC"]');
            const listContainer = row.querySelector('div[class="_iQpvk1c9OgRAc8KRTlH"]');
    
            if (compactContainer) {
                const explicitSpan = compactContainer.querySelector('.Ps9zgW56WZaBVLo1n3cg');
                if (explicitSpan) {
                    const parentSpan = explicitSpan.closest('span[data-encore-id="text"]');
                    parentSpan.after(copyBtn);
                } else {
                    compactContainer.appendChild(copyBtn);
                }
            } else if (listContainer) {
                const textContainer = listContainer.querySelector('[data-encore-id="text"]');
                if (textContainer) {
                    textContainer.style.display = 'flex';
                    textContainer.style.alignItems = 'center';
                    textContainer.appendChild(copyBtn);
                } else {
                    listContainer.appendChild(copyBtn);
                }
            }
        });
    }

    function createOptionsButton() {
        const actionBar = document.querySelector('.eSg4ntPU2KQLfpLGXAww[data-testid="action-bar-row"]');
        if (!actionBar || actionBar.querySelector('.spotify-copy-options')) return;
    
        const optionsBtn = document.createElement('button');
        optionsBtn.className = 'spotify-copy-options';
        optionsBtn.style.cssText = `
            background: transparent;
            border: none;
            color: #b3b3b3;
            cursor: pointer;
            display: flex;
            align-items: center;
            font-size: 14px;
            font-weight: 500;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            transition: color 0.2s ease;
        `;
    
        optionsBtn.addEventListener('mouseover', () => {
            optionsBtn.style.color = '#ffffff';
        });
    
        optionsBtn.addEventListener('mouseout', () => {
            optionsBtn.style.color = '#b3b3b3';
        });
    
        const icon = optionsIcon.cloneNode(true);
        icon.style.cssText = `
            margin-right: 8px;
            width: 16px;
            height: 16px;
            fill: currentColor;
            vertical-align: middle;
        `;
        
        const optionsText = document.createElement('span');
        optionsText.textContent = 'OPTIONS';
        optionsText.style.cssText = `
            font-family: CircularSp, CircularSp-Arab, CircularSp-Hebr, CircularSp-Cyrl, CircularSp-Grek, CircularSp-Deva, var(--font-family,CircularSp,CircularSp-Arab,CircularSp-Hebr,CircularSp-Cyrl,CircularSp-Grek,CircularSp-Deva,sans-serif);
            letter-spacing: 1px;
            font-size: 14px;
        `;
    
        optionsBtn.appendChild(icon);
        optionsBtn.appendChild(optionsText);
    
        const menu = document.createElement('div');
        menu.className = 'spotify-copy-menu';
        menu.style.cssText = `
            display: none;
            position: absolute;
            background-color: #282828;
            padding: 4px;
            border-radius: 4px;
            z-index: 1000;
            box-shadow: 0 16px 24px rgba(0,0,0,.3),0 6px 8px rgba(0,0,0,.2);
            min-width: 196px;
            max-width: 350px;
            border: 1px solid rgba(255,255,255,0.1);
        `;
    
        const toggleOption = createMenuItem(settings.isEnabled ? 'Enabled' : 'Disabled',
                                         settings.isEnabled ? enabledIcon : disabledIcon,
                                         'toggle');
        const separator = createMenuSeparator();
        const titleFirstOption = createMenuItem('Track Info (Title - Artist)', titleIcon, 'titleFirst');
        const artistFirstOption = createMenuItem('Track Info (Artist - Title)', artistIcon, 'artistFirst');
        const trackIdOption = createMenuItem('Track ID', trackIdIcon, 'trackId');
        const trackLinkOption = createMenuItem('Track Link', trackLinkIcon, 'trackLink');
    
        menu.appendChild(toggleOption);
        menu.appendChild(separator);
        menu.appendChild(titleFirstOption);
        menu.appendChild(artistFirstOption);
        menu.appendChild(trackIdOption);
        menu.appendChild(trackLinkOption);
    
        optionsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
            const rect = optionsBtn.getBoundingClientRect();
            menu.style.top = `${rect.bottom + 5}px`;
            menu.style.left = `${rect.left}px`;
        });
    
        document.addEventListener('click', () => {
            menu.style.display = 'none';
        });
    
        const moreButton = actionBar.querySelector('[data-testid="more-button"]');
        if (moreButton) {
            moreButton.after(optionsBtn);
        }
        document.body.appendChild(menu);
    }

    function createMenuItem(text, icon, value) {
        const item = document.createElement('div');
        item.className = 'spotify-copy-menu-item';
        item.style.padding = '8px';
        item.style.cursor = 'pointer';
        item.style.display = 'flex';
        item.style.alignItems = 'center';

        if (value === 'toggle') {
            item.style.color = settings.isEnabled ? '#1ed760' : '#f3727f';
        } else {
            item.style.color = settings.copyType === value ? '#1ed760' : '#ffffff';
        }

        item.appendChild(icon.cloneNode(true));
        const textSpan = document.createElement('span');
        textSpan.textContent = text;
        item.appendChild(textSpan);

        item.addEventListener('mouseover', () => {
            item.style.backgroundColor = '#333333';
        });

        item.addEventListener('mouseout', () => {
            item.style.backgroundColor = 'transparent';
        });

        item.addEventListener('click', () => {
            if (value === 'toggle') {
                settings.isEnabled = !settings.isEnabled;
                item.style.color = settings.isEnabled ? '#1ed760' : '#f3727f';
                item.replaceChild(settings.isEnabled ? enabledIcon.cloneNode(true) : disabledIcon.cloneNode(true), item.firstChild);
                textSpan.textContent = settings.isEnabled ? 'Enabled' : 'Disabled';

                if (!settings.isEnabled) {
                    removeCopyButtons();
                } else {
                    addCopyButton();
                }
            } else {
                settings.copyType = value;
                document.querySelectorAll('.spotify-copy-menu-item').forEach(menuItem => {
                    if (!menuItem.textContent.includes('Enabled') && !menuItem.textContent.includes('Disabled')) {
                        menuItem.style.color = menuItem.textContent.includes(text) ? '#1ed760' : '#ffffff';
                    }
                });
            }
            GM_setValue('spotifyCopySettings', settings);
        });

        return item;
    }

    function initialize() {
        createOptionsButton();
        addCopyButton();
    }

    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            if (mutation.addedNodes.length) {
                initialize();
            }
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    initialize();
})();
