// ==UserScript==
// @name         Spotify Enhancer (YouTube Search)
// @description  Easily find YouTube videos for a Spotify track.
// @icon         https://raw.githubusercontent.com/exyezed/spotify-enhancer/refs/heads/main/extras/spotify-enhancer.png
// @version      1.6
// @author       exyezed
// @namespace    https://github.com/exyezed/spotify-enhancer/
// @supportURL   https://github.com/exyezed/spotify-enhancer/issues
// @license      MIT
// @match        https://open.spotify.com/*
// @grant        GM_openInTab
// @grant        GM_xmlhttpRequest
// @connect      api.spotify.com
// @connect      www.youtube.com
// ==/UserScript==

(function() {
    'use strict';

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

    async function getSpotifyToken() {
        const resources = performance.getEntriesByType('resource');
        
        for (const resource of resources) {
            if (resource.name.includes('https://open.spotify.com/get_access_token')) {
                try {
                    const response = await fetch(resource.name);
                    const data = await response.json();
                    
                    if (data && data.accessToken) {
                        return data.accessToken;
                    }
                } catch (error) {}
            }
        }
        
        try {
            const spotifyObject = JSON.parse(localStorage.getItem('spotify-web-player:access-token'));
            if (spotifyObject && spotifyObject.value) {
                return spotifyObject.value;
            }
        } catch (e) {}
        
        return null;
    }

    async function getSingleTrack(trackId, token) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: `https://api.spotify.com/v1/tracks/${trackId}`,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'sec-ch-ua-platform': '"Windows"',
                    'Referer': 'https://open.spotify.com/',
                    'Origin': 'https://open.spotify.com'
                },
                onload: function(response) {
                    try {
                        if (response.status === 200) {
                            const track = JSON.parse(response.responseText);
                            resolve({ 
                                title: track.name, 
                                artists: track.artists.map(a => a.name).join(', ') 
                            });
                        } else {
                            reject(`HTTP error! Status: ${response.status}`);
                        }
                    } catch (error) {
                        reject(`Error parsing track data: ${error}`);
                    }
                },
                onerror: function(error) {
                    reject(`Error getting track data: ${error}`);
                }
            });
        });
    }

    function calculateSimilarity(str1, str2) {
        str1 = str1.toLowerCase();
        str2 = str2.toLowerCase();
        
        const commonWords = ['official', 'music', 'video', 'lyrics', 'audio', 'ft', 'feat', 'featuring', 'prod', 'by'];
        for (const word of commonWords) {
            str1 = str1.replace(new RegExp(`\\b${word}\\b`, 'g'), '');
            str2 = str2.replace(new RegExp(`\\b${word}\\b`, 'g'), '');
        }
        
        str1 = str1.replace(/\s+/g, ' ').trim();
        str2 = str2.replace(/\s+/g, ' ').trim();
        
        if (str1 === str2) return 1.0;
        if (str1.length === 0 || str2.length === 0) return 0.0;
        
        if (str1.includes(str2)) return 0.9;
        if (str2.includes(str1)) return 0.9;
        
        const words1 = str1.split(' ');
        const words2 = str2.split(' ');
        
        let matchCount = 0;
        for (const word1 of words1) {
            if (word1.length < 2) continue;
            for (const word2 of words2) {
                if (word2.length < 2) continue;
                if (word1 === word2 || word1.includes(word2) || word2.includes(word1)) {
                    matchCount++;
                    break;
                }
            }
        }
        
        return matchCount / Math.max(words1.length, words2.length);
    }

    function getOfficialMusicVideoScore(title) {
        const lowerTitle = title.toLowerCase();
        
        if (lowerTitle.includes("official music video")) return 3;
        
        if (lowerTitle.includes("official") && lowerTitle.includes("video")) return 2;
        
        if (lowerTitle.includes("official") || lowerTitle.includes("music video")) return 1;
        
        return 0;
    }

    async function searchYouTube(query, artistName, originalTitle) {
        return new Promise((resolve, reject) => {
            const encodedQuery = encodeURIComponent(query);
            GM_xmlhttpRequest({
                method: 'GET',
                url: `https://www.youtube.com/results?search_query=${encodedQuery}`,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                    'Accept-Language': 'en-US,en;q=0.9'
                },
                onload: function(response) {
                    try {
                        let initialData = null;
                        
                        const initialDataMatch = response.responseText.match(/var ytInitialData = ({.+?});/);
                        if (initialDataMatch && initialDataMatch[1]) {
                            try {
                                initialData = JSON.parse(initialDataMatch[1]);
                                console.log("Extracted data using pattern 1");
                            } catch (e) {}
                        }
                        
                        if (!initialData) {
                            const scriptTags = response.responseText.match(/<script[^>]*>([^<]+)<\/script>/g);
                            if (scriptTags) {
                                for (const scriptTag of scriptTags) {
                                    if (scriptTag.includes('ytInitialData')) {
                                        const dataMatch = scriptTag.match(/ytInitialData\s*=\s*({.+?});/);
                                        if (dataMatch && dataMatch[1]) {
                                            try {
                                                initialData = JSON.parse(dataMatch[1]);
                                                console.log("Extracted data using pattern 2");
                                                break;
                                            } catch (e) {}
                                        }
                                    }
                                }
                            }
                        }
                        
                        if (!initialData) {
                            const dataMatch = response.responseText.match(/ytInitialData\s*=\s*({.+?});/);
                            if (dataMatch && dataMatch[1]) {
                                const cleanedJson = dataMatch[1]
                                    .replace(/\\"/g, '"')
                                    .replace(/\\n/g, '')
                                    .replace(/\\t/g, '')
                                    .replace(/\\\\/g, '\\');
                                    
                                try {
                                    initialData = JSON.parse(cleanedJson);
                                    console.log("Extracted data using pattern 3");
                                } catch (e) {}
                            }
                        }
                        
                        if (!initialData) {
                            const windowDataMatch = response.responseText.match(/window\["ytInitialData"\]\s*=\s*({.+?});/);
                            if (windowDataMatch && windowDataMatch[1]) {
                                try {
                                    initialData = JSON.parse(windowDataMatch[1]);
                                    console.log("Extracted data using pattern 4");
                                } catch (e) {}
                            }
                        }
                        
                        if (!initialData) {
                            return reject('Could not extract YouTube data. Try refreshing the page.');
                        }
                        
                        let videos = [];
                        let contents = null;
                        
                        if (initialData.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents) {
                            contents = initialData.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents;
                        } else if (initialData.contents?.sectionListRenderer?.contents) {
                            contents = initialData.contents.sectionListRenderer.contents;
                        }
                        
                        if (!contents || !contents.length) {
                            return reject('No search results found in the YouTube data structure. Try refreshing the page.');
                        }
                        
                        for (const section of contents) {
                            const items = section.itemSectionRenderer?.contents || 
                                        section.contents || 
                                        [];
                                        
                            for (const item of items) {
                                if (item.videoRenderer) {
                                    const video = item.videoRenderer;
                                    
                                    const title = video.title?.runs?.[0]?.text || 
                                                video.title?.simpleText || 
                                                'Unknown Title';
                                                
                                    const viewText = video.viewCountText?.simpleText || 
                                                video.viewCountText?.runs?.[0]?.text || 
                                                '0 views';
                                                
                                    let viewCount = 0;
                                    const viewMatch = viewText.match(/[\d,]+/);
                                    if (viewMatch) {
                                        viewCount = parseInt(viewMatch[0].replace(/,/g, ''));
                                    }
                                    
                                    const channelName = video.ownerText?.runs?.[0]?.text || 
                                                    video.longBylineText?.runs?.[0]?.text || 
                                                    video.shortBylineText?.runs?.[0]?.text || 
                                                    '';
                                                    
                                    const isVerified = (
                                        (video.ownerBadges && video.ownerBadges.some(badge => 
                                            badge.metadataBadgeRenderer?.style?.includes('VERIFIED'))) ||
                                        (video.badges && video.badges.some(badge => 
                                            badge.metadataBadgeRenderer?.style?.includes('VERIFIED')))
                                    ) || false;
                                    
                                    const officialMusicVideoScore = getOfficialMusicVideoScore(title);
                                    const similarityScore = calculateSimilarity(title, originalTitle);
                                    
                                    videos.push({
                                        video_id: video.videoId,
                                        title: title,
                                        channelName: channelName,
                                        isVerified: isVerified,
                                        officialMusicVideoScore: officialMusicVideoScore,
                                        views: viewText,
                                        viewCount: viewCount,
                                        similarityScore: similarityScore,
                                        url: `https://www.youtube.com/watch?v=${video.videoId}`
                                    });
                                }
                            }
                        }
                        
                        if (videos.length === 0) {
                            return reject('No videos found in search results. Try refreshing the page.');
                        }
                        
                        console.log(`Found ${videos.length} videos in search results`);
                        
                        let bestMatch = videos.find(v => 
                            v.similarityScore > 0.8 && 
                            v.isVerified && 
                            v.channelName.toLowerCase().includes(artistName.toLowerCase())
                        );
                        
                        if (!bestMatch) {
                            bestMatch = videos.find(v => 
                                v.title.toLowerCase().includes(originalTitle.toLowerCase()) &&
                                v.isVerified &&
                                v.channelName.toLowerCase().includes(artistName.toLowerCase())
                            );
                        }
                        
                        if (!bestMatch) {
                            bestMatch = videos.find(v => 
                                v.similarityScore > 0.5 && 
                                v.officialMusicVideoScore >= 1 &&
                                v.isVerified && 
                                v.channelName.toLowerCase().includes(artistName.toLowerCase())
                            );
                        }
                        
                        if (!bestMatch) {
                            bestMatch = videos.find(v => v.similarityScore > 0.7);
                        }
                        
                        if (!bestMatch) {
                            const titleWords = originalTitle.toLowerCase().split(' ').filter(word => word.length > 3);
                            bestMatch = videos.find(v => 
                                v.isVerified && 
                                v.channelName.toLowerCase().includes(artistName.toLowerCase()) &&
                                titleWords.some(word => v.title.toLowerCase().includes(word))
                            );
                        }
                        
                        if (!bestMatch) {
                            bestMatch = videos.find(v => 
                                v.officialMusicVideoScore >= 1 &&
                                v.isVerified &&
                                v.channelName.toLowerCase().includes(artistName.toLowerCase())
                            );
                        }
                        
                        if (!bestMatch) {
                            bestMatch = videos.find(v => 
                                v.title.toLowerCase().includes(originalTitle.toLowerCase()) &&
                                (v.title.toLowerCase().includes("audio") || v.title.toLowerCase().includes("lyric")) &&
                                v.isVerified &&
                                v.channelName.toLowerCase().includes(artistName.toLowerCase())
                            );
                        }
                        
                        if (!bestMatch) {
                            const artistVideos = videos.filter(v => 
                                v.isVerified && 
                                v.channelName.toLowerCase().includes(artistName.toLowerCase())
                            );
                            
                            if (artistVideos.length > 0) {
                                artistVideos.sort((a, b) => b.viewCount - a.viewCount);
                                bestMatch = artistVideos[0];
                            }
                        }
                        
                        if (!bestMatch && videos.length > 0) {
                            videos.sort((a, b) => b.viewCount - a.viewCount);
                            bestMatch = videos[0];
                        }
                        
                        if (bestMatch) {
                            console.log("Selected video:", bestMatch);
                            resolve(bestMatch);
                        } else {
                            reject('No suitable videos found in search results. Try refreshing the page.');
                        }
                    } catch (error) {
                        reject(`Error parsing YouTube search results: ${error.message}. Try refreshing the page.`);
                    }
                },
                onerror: function(error) {
                    reject(`Error searching YouTube: ${error}. Try refreshing the page.`);
                }
            });
        });
    }

    async function processTrack(trackId, _youtubeIcon, _spinnerIcon) {
        try {
            let token = null;
            let retries = 0;
            const maxRetries = 3;
            
            while (!token && retries < maxRetries) {
                try {
                    token = await getSpotifyToken();
                    if (!token) {
                        throw new Error('Empty token returned');
                    }
                } catch (err) {
                    retries++;
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            
            if (!token) {
                throw new Error('Failed to get Spotify token after multiple attempts. Try refreshing the page.');
            }
            
            const trackData = await getSingleTrack(trackId, token);
            if (!trackData) {
                throw new Error('Track not found. Try refreshing the page.');
            }
            
            const primaryArtist = trackData.artists.split(',')[0].trim();
            const originalTitle = trackData.title;
            
            console.log(`Searching YouTube for: ${trackData.title} - ${trackData.artists} official music video`);
            
            const searchQuery = `${trackData.title} - ${primaryArtist} official music video`;
            
            try {
                const videoData = await searchYouTube(searchQuery, primaryArtist, originalTitle);
                if (!videoData) {
                    throw new Error('YouTube video not found. Try refreshing the page.');
                }
                
                GM_openInTab(videoData.url, { active: true });
            } catch (youtubeError) {
                try {
                    console.log("First search failed, trying fallback search");
                    const fallbackQuery = `${trackData.title} ${primaryArtist} official`;
                    const fallbackData = await searchYouTube(fallbackQuery, primaryArtist, originalTitle);
                    
                    if (fallbackData) {
                        GM_openInTab(fallbackData.url, { active: true });
                    } else {
                        throw new Error('Fallback search failed. Try refreshing the page.');
                    }
                } catch (fallbackError) {
                    console.log("Fallback search also failed, opening YouTube search results page");
                    const manualSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
                    GM_openInTab(manualSearchUrl, { active: true });
                    throw new Error('Error finding YouTube video. Try refreshing the page.');
                }
            }
            
        } catch (error) {
            alert('Error finding YouTube video. Try refreshing the page.');
        }
    }

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
                
                youtubeIcon.addEventListener('click', async () => {
                    youtubeIcon.style.display = 'none';
                    spinnerIcon.style.display = 'inline-block';
                    
                    try {
                        await processTrack(trackId, youtubeIcon, spinnerIcon);
                    } finally {
                        youtubeIcon.style.display = 'inline-block';
                        spinnerIcon.style.display = 'none';
                    }
                });
                
                h1.appendChild(iconContainer);
            }
        });
    }
    
    function extractTrackId() {
        const urlMatch = window.location.href.match(/track\/([a-zA-Z0-9]+)/);
        return urlMatch ? urlMatch[1] : null;
    }
    
    function removeYouTubeIcon() {
        const iconContainer = document.querySelector('.youtube-icon')?.parentNode;
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
})();
