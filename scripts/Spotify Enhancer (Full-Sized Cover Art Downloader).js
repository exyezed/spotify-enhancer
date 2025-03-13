// ==UserScript==
// @name         Spotify Enhancer (Full-Sized Cover Art Downloader)
// @description  Add a button to view and download full-sized cover art.
// @icon         https://raw.githubusercontent.com/exyezed/spotify-enhancer/refs/heads/main/extras/spotify-enhancer.png
// @version      1.7
// @author       exyezed
// @namespace    https://github.com/exyezed/spotify-enhancer/
// @supportURL   https://github.com/exyezed/spotify-enhancer/issues
// @license      MIT
// @match        *://open.spotify.com/*
// @grant        GM_addStyle
// @require      https://cdn.jsdelivr.net/npm/@iconify/iconify@3.1.1/dist/iconify.min.js
// ==/UserScript==

(function() {
    'use strict';

    const styles = `
        .preview-modal-title {
            color: white;
            font-size: 16px;
            margin-bottom: 16px;
            text-align: center;
            max-width: 90vw;
            word-wrap: break-word;
        }

        .custom-overlay-button {
            position: absolute;
            top: 10px;
            right: 10px;
            z-index: 9999 !important;
            background: rgba(0, 0, 0, 0.7);
            border: none;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            transition: all 0.3s ease;
            pointer-events: all !important;
        }

        .custom-overlay-button:hover {
            background: rgba(0, 0, 0, 0.9);
        }

        .custom-overlay-button svg {
            width: 18px;
            height: 18px;
            opacity: 1;
            transition: opacity 0.3s ease;
        }

        .custom-overlay-button .icon-normal {
            position: absolute;
        }

        .custom-overlay-button .icon-hover {
            position: absolute;
            opacity: 0;
            color: #1ed760;
        }

        .custom-overlay-button:hover .icon-normal {
            opacity: 0;
        }

        .custom-overlay-button:hover .icon-hover {
            opacity: 1;
        }

        .custom-overlay-button * {
            pointer-events: none;
        }

        .preview-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.1s ease, visibility 0.1s ease;
        }

        .preview-modal.active {
            opacity: 1;
            visibility: visible;
        }

        .preview-modal-content {
            position: relative;
            max-width: 90vw;
            max-height: 90vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            transform: scale(0.95);
            transition: transform 0.1s ease;
        }

        .preview-modal.active .preview-modal-content {
            transform: scale(1);
        }

        .preview-modal-content.loading .preview-actions {
            opacity: 0;
            visibility: hidden;
        }
        
        .preview-modal-content .preview-actions {
            opacity: 1;
            visibility: visible;
            transition: opacity 0.1s ease, visibility 0.1s ease;
        }

        .preview-modal img {
            max-width: 100%;
            max-height: 80vh;
            object-fit: contain;
            cursor: pointer;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        }

        .preview-actions {
            margin-top: 16px;
        }

        .fetch-button {
            position: relative;
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            padding: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.1s ease;
            gap: 6px;
        }

        .fetch-button:hover {
            opacity: 1;
            color: #1ed760;
        }

        .fetch-button svg {
            width: 18px !important;
            height: 18px !important;
        }

        .fetch-button span {
            font-size: 14px;
            font-weight: 600;
            text-transform: uppercase;
        }
    `;

    GM_addStyle(styles);

    const modal = document.createElement('div');
    modal.className = 'preview-modal';
    document.body.appendChild(modal);

    async function downloadImage(url, filename) {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename + '.jpg';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Download failed:', error);
        }
    }

    function createModal(imageUrl, title) {
        const content = document.createElement('div');
        content.className = 'preview-modal-content loading';

        const titleDiv = document.createElement('div');
        titleDiv.className = 'preview-modal-title';

        const img = document.createElement('img');
        img.onload = () => {
            content.classList.remove('loading');
            titleDiv.textContent = `${title} (${img.naturalWidth} x ${img.naturalHeight})`;
            if (window.Iconify) {
                window.Iconify.scan(content);
            }
        };
        img.src = imageUrl;
        img.alt = title;
        img.onclick = () => {
            window.open(imageUrl, '_blank');
        };

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'preview-actions';

        const fetchButton = document.createElement('button');
        fetchButton.className = 'fetch-button';
        const downloadIcon = document.createElement('span');
        downloadIcon.className = 'iconify';
        downloadIcon.setAttribute('data-icon', 'line-md:downloading-loop');
        downloadIcon.setAttribute('data-width', '18');
        downloadIcon.setAttribute('data-height', '18');
        const downloadText = document.createElement('span');
        downloadText.textContent = 'DOWNLOAD';
        fetchButton.appendChild(downloadIcon);
        fetchButton.appendChild(downloadText);
        fetchButton.onclick = (e) => {
            e.stopPropagation();
            downloadImage(imageUrl, title || 'spotify-cover');
        };

        actionsDiv.appendChild(fetchButton);
        content.appendChild(titleDiv);
        content.appendChild(img);
        content.appendChild(actionsDiv);
        
        while (modal.firstChild) {
            modal.removeChild(modal.firstChild);
        }
        modal.appendChild(content);
        modal.classList.add('active');

        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        };

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                modal.classList.remove('active');
            }
        });
    }

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

            const iconNormal = document.createElement('span');
            iconNormal.className = 'iconify icon-normal';
            iconNormal.setAttribute('data-icon', 'mdi:image-size-select-large');
            iconNormal.setAttribute('data-width', '18');
            iconNormal.setAttribute('data-height', '18');

            const iconHover = document.createElement('span');
            iconHover.className = 'iconify icon-hover';
            iconHover.setAttribute('data-icon', 'mdi:image-size-select-actual');
            iconHover.setAttribute('data-width', '18');
            iconHover.setAttribute('data-height', '18');

            button.appendChild(iconNormal);
            button.appendChild(iconHover);

            const handleClick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();

                const title = getTitleFromElement(cardElement);
                const fullsizeUrl = getFullsizeUrl(imgElement.src);
                createModal(fullsizeUrl, title);

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
