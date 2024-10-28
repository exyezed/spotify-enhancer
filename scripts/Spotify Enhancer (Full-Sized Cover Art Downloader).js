// ==UserScript==
// @name         Spotify Enhancer (Full-Sized Cover Art Downloader)
// @description  Integrates an overlay button in Spotify Web Player to view and download full-sized (2000px) album cover art.
// @icon         https://raw.githubusercontent.com/exyezed/spotify-enhancer/refs/heads/main/extras/spotify-enhancer.png
// @version      1.2
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
    materialIconsLink.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&icon_names=add_photo_alternate,download,open_in_new';
    document.head.appendChild(materialIconsLink);

    const styles = `
        :root {
            --spotify-font-stack: SpotifyMixUI,CircularSp-Arab,CircularSp-Hebr,CircularSp-Cyrl,CircularSp-Grek,CircularSp-Deva,var(--fallback-fonts,sans-serif);
            --spotify-title-font-stack: SpotifyMixUITitle,CircularSp-Arab,CircularSp-Hebr,CircularSp-Cyrl,CircularSp-Grek,CircularSp-Deva,var(--fallback-fonts,sans-serif);
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

        .modal-button .material-symbols-outlined {
            --icon-fill: 0;
            --icon-weight: 500;
            --icon-size: 28;
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

        .fullsize-modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            z-index: 99999;
            justify-content: center;
            align-items: center;
            flex-direction: column;
            font-family: var(--spotify-font-stack);
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        .fullsize-modal.active {
            display: flex;
            opacity: 1;
        }

        .modal-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            max-height: 90vh;
            margin: 20px;
            position: relative;
        }

        .fullsize-modal img {
            max-width: 90vw;
            max-height: calc(90vh - 60px);
            object-fit: contain;
            opacity: 0;
            transition: opacity 0.5s ease;
        }

        .fullsize-modal img.loaded {
            opacity: 1;
        }

        .modal-title {
            color: white;
            font-size: 1.5rem;
            margin-bottom: 1rem;
            font-family: var(--spotify-title-font-stack);
            letter-spacing: -0.04em;
            font-weight: 700;
            text-align: center;
            max-width: 90vw;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            opacity: 0;
            transition: opacity 0.5s ease;
        }

        .modal-title.loaded {
            opacity: 1;
        }

        .modal-controls {
            position: absolute;
            top: 20px;
            right: 20px;
            display: flex;
            gap: 10px;
            z-index: 100000;
        }

        .modal-button {
            color: white;
            font-size: 30px;
            cursor: pointer;
            background: rgba(32, 32, 32, 0.9);
            border: none;
            padding: 10px;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
            font-family: var(--spotify-font-stack);
            backdrop-filter: blur(5px);
        }

        .modal-button:hover {
            background: rgba(45, 45, 45, 0.95);
            transform: scale(1.1);
        }

        .modal-button.download-button:hover {
            color: #1ed760;
        }

        .modal-button.close-button:hover {
            color: #f3727f;
        }

        .modal-button.open-tab-button:hover {
            color: #4cb3ff;
        }

        .loading-spinner {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 120px;
            height: 120px;
            color: #1ed760;
            opacity: 0;
            transition: opacity 0.3s ease;
            pointer-events: none;
        }

        .loading-spinner.active {
            opacity: 1;
        }

        @keyframes rotate {
            from {
                transform: rotate(0deg);
            }
            to {
                transform: rotate(360deg);
            }
        }

        .loading-spinner .spinner-circle {
            animation: rotate 1s linear infinite;
            transform-origin: center;
            opacity: 0;
            transition: opacity 0.2s ease;
        }

        .loading-spinner.active .spinner-circle {
            opacity: 1;
        }
    `;

    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);

    function sanitizeFilename(filename) {
        return filename.replace(/[/\\?%*:|"<>]/g, '-').trim() + '.jpeg';
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

    async function downloadImage(url, title) {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = blobUrl;
            const filename = sanitizeFilename(title);
            a.download = filename;
            
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Download failed:', error);
        }
    }

    function createLoadingSpinner() {
        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner';
        spinner.innerHTML = `
            <svg class="spinner-circle" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12,1A11,11,0,1,0,23,12,11,11,0,0,0,12,1Zm0,19a8,8,0,1,1,8-8A8,8,0,0,1,12,20Z" opacity="0.25"/>
                <path fill="currentColor" d="M10.14,1.16a11,11,0,0,0-9,8.92A1.59,1.59,0,0,0,2.46,12,1.52,1.52,0,0,0,4.11,10.7a8,8,0,0,1,6.66-6.61A1.42,1.42,0,0,0,12,2.69h0A1.57,1.57,0,0,0,10.14,1.16Z"/>
            </svg>
        `;
        return spinner;
    }

    function createModal() {
        const modal = document.createElement('div');
        modal.className = 'fullsize-modal';
        
        const controls = document.createElement('div');
        controls.className = 'modal-controls';
        
        const openTabButton = document.createElement('button');
        openTabButton.className = 'modal-button open-tab-button';
        const openTabIcon = document.createElement('span');
        openTabIcon.className = 'material-symbols-outlined';
        openTabIcon.textContent = 'open_in_new';
        openTabButton.appendChild(openTabIcon);
        
        const downloadButton = document.createElement('button');
        downloadButton.className = 'modal-button download-button';
        const downloadIcon = document.createElement('span');
        downloadIcon.className = 'material-symbols-outlined';
        downloadIcon.textContent = 'download';
        downloadButton.appendChild(downloadIcon);
        
        const closeButton = document.createElement('button');
        closeButton.className = 'modal-button close-button';
        closeButton.innerHTML = '×';
        closeButton.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            modal.classList.remove('active');
            const spinner = modal.querySelector('.loading-spinner');
            const img = modal.querySelector('img');
            const titleDiv = modal.querySelector('.modal-title');
            spinner.classList.remove('active');
            img.classList.remove('loaded');
            titleDiv.classList.remove('loaded');
            img.src = '';
        };
        
        controls.appendChild(openTabButton);
        controls.appendChild(downloadButton);
        controls.appendChild(closeButton);

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        
        const titleDiv = document.createElement('div');
        titleDiv.className = 'modal-title';
        
        const spinner = createLoadingSpinner();
        
        const img = document.createElement('img');
        img.addEventListener('load', () => {
            setTimeout(() => {
                spinner.classList.remove('active');
                img.classList.add('loaded');
                titleDiv.classList.add('loaded');
            }, 300);
        });
        
        modalContent.appendChild(titleDiv);
        modalContent.appendChild(spinner);
        modalContent.appendChild(img);
        
        modal.appendChild(controls);
        modal.appendChild(modalContent);
        document.body.appendChild(modal);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                e.preventDefault();
                e.stopPropagation();
                modal.classList.remove('active');
                spinner.classList.remove('active');
                img.classList.remove('loaded');
                titleDiv.classList.remove('loaded');
                img.src = '';
            }
        });

        return modal;
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

            let modal = document.querySelector('.fullsize-modal') || createModal();

            const handleClick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();

                const title = getTitleFromElement(cardElement);
                const fullsizeUrl = getFullsizeUrl(imgElement.src);

                const modalImg = modal.querySelector('img');
                const modalTitle = modal.querySelector('.modal-title');
                const spinner = modal.querySelector('.loading-spinner');
                
                modal.classList.add('active');
                
                setTimeout(() => {
                    modalImg.classList.remove('loaded');
                    spinner.classList.add('active');
                    
                    modalImg.src = fullsizeUrl;
                    modalTitle.textContent = title;
                }, 50);

                const downloadButton = modal.querySelector('.download-button');
                downloadButton.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    downloadImage(fullsizeUrl, title);
                };

                const openTabButton = modal.querySelector('.open-tab-button');
                openTabButton.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.open(fullsizeUrl, '_blank');
                };

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
