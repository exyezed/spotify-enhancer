// ==UserScript==
// @name         Spotify Enhancer (Full-Sized Cover Art Viewer)
// @description  Integrates an overlay button in Spotify Web Player to open full-sized (2000px) album cover art in a new tab.
// @icon         https://raw.githubusercontent.com/exyezed/spotify-enhancer/refs/heads/main/extras/spotify-enhancer.png
// @version      1.3
// @author       exyezed
// @namespace    https://github.com/exyezed/spotify-enhancer/
// @supportURL   https://github.com/exyezed/spotify-enhancer/issues
// @license      MIT
// @match        *://open.spotify.com/*
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    const materialIconsLink = document.createElement('link');
    materialIconsLink.rel = 'stylesheet';
    materialIconsLink.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&icon_names=add_photo_alternate';
    document.head.appendChild(materialIconsLink);

    const styles = `
        :root {
            --spotify-font-stack: SpotifyMixUI,CircularSp-Arab,CircularSp-Hebr,CircularSp-Cyrl,CircularSp-Grek,CircularSp-Deva,var(--fallback-fonts,sans-serif);
            --icon-weight: 400;
            --icon-fill: 1;
            --icon-grade: 0;
            --icon-size: 24;
        }

        .material-symbols-outlined {
            font-variation-settings:
                'FILL' var(--icon-fill),
                'wght' var(--icon-weight),
                'GRAD' var(--icon-grade),
                'opsz' var(--icon-size);
            font-size: 24px;
            vertical-align: middle;
        }

        .custom-overlay-button .material-symbols-outlined {
            --icon-fill: 0;
            --icon-weight: 400;
        }

        .custom-overlay-button {
            position: absolute;
            top: 10px;
            right: 10px;
            z-index: 9999 !important;
            background: rgba(0, 0, 0, 0.7);
            border: none;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            transition: all 0.3s ease;
            pointer-events: all !important;
            font-family: var(--spotify-font-stack);
        }
        
        .custom-overlay-button:hover {
            background: rgba(0, 0, 0, 0.9);
            transform: scale(1.1);
        }
        
        .custom-overlay-button:hover .material-symbols-outlined {
            --icon-fill: 1; 
        }
        
        .custom-overlay-button * {
            pointer-events: none;
        }
    `;

    GM_addStyle(styles);

    function getTitleFromElement(element) {
        const playButton = element.querySelector('button[aria-label^="Play"]');
        if (playButton) {
            const ariaLabel = playButton.getAttribute('aria-label');
            if (ariaLabel) {
                return ariaLabel.replace('Play ', '');
            }
        }

        const entityTitle = element.querySelector('[data-testid="entityTitle"] h1');
        if (entityTitle) {
            return entityTitle.textContent.trim();
        }

        const img = element.querySelector('img[alt]:not([alt=""])');
        if (img && img.alt) {
            return img.alt;
        }

        return 'spotify-cover';
    }

    function getFullsizeUrl(originalUrl) {
        const resolutionPatterns = {
            'ab67616d00004851': 'ab67616d000082c1',
            'ab67616d0000b273': 'ab67616d000082c1',
            'ab67616d00001e02': 'ab67616d000082c1',
            
            'ab67616100005174': 'ab6761610000e5eb',
            'ab6761610000f174': 'ab6761610000e5eb',
            'ab676161000051748': 'ab6761610000e5eb',
            'ab67616100000000': 'ab6761610000e5eb'
        };

        let newUrl = originalUrl;
        for (const [pattern, replacement] of Object.entries(resolutionPatterns)) {
            if (originalUrl.includes(pattern)) {
                newUrl = originalUrl.replace(pattern, replacement);
                break;
            }
        }
        return newUrl;
    }

    function addOverlayButton(cardElement) {
        if (cardElement && !cardElement.querySelector('.custom-overlay-button')) {
            const imgElement = cardElement.querySelector('img');
            if (!imgElement) return;

            const button = document.createElement('button');
            button.className = 'custom-overlay-button';
            button.setAttribute('tabindex', '0');

            const icon = document.createElement('span');
            icon.className = 'material-symbols-outlined';
            icon.textContent = 'add_photo_alternate';

            button.appendChild(icon);

            const handleClick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();

                const title = getTitleFromElement(cardElement);
                const fullsizeUrl = getFullsizeUrl(imgElement.src);

                window.open(fullsizeUrl, '_blank');

                return false;
            };

            button.addEventListener('click', handleClick, true);
            button.addEventListener('mousedown', (e) => e.stopPropagation(), true);
            button.addEventListener('mouseup', (e) => e.stopPropagation(), true);
            button.addEventListener('touchstart', (e) => e.stopPropagation(), true);
            button.addEventListener('touchend', (e) => e.stopPropagation(), true);

            const buttonWrapper = document.createElement('div');
            buttonWrapper.style.cssText = `
                position: absolute;
                top: 0;
                right: 0;
                z-index: 9999;
                pointer-events: none;
                padding: 5px;
            `;
            buttonWrapper.appendChild(button);

            cardElement.style.position = 'relative';
            cardElement.appendChild(buttonWrapper);
        }
    }

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) {
                    const cards = [
                        ...Array.from(node.classList?.contains('xBV4XgMq0gC5lQICFWY_') ? [node] : node.querySelectorAll('.xBV4XgMq0gC5lQICFWY_')),
                        ...Array.from(node.classList?.contains('CmkY1Ag0tJDfnFXbGgju') ? [node] : node.querySelectorAll('.CmkY1Ag0tJDfnFXbGgju'))
                    ];

                    cards.forEach(addOverlayButton);
                }
            });
        });
    });

    function initialize() {
        const existingCards = document.querySelectorAll('.xBV4XgMq0gC5lQICFWY_, .CmkY1Ag0tJDfnFXbGgju');
        existingCards.forEach(addOverlayButton);

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();
