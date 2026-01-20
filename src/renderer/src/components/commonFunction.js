 export const extractVideoId = (url) => {
    const fullUrlMatch = url.match(/[?&]v=([^&]+)/)
    if (fullUrlMatch) return fullUrlMatch[1]
    const shortUrlMatch = url.match(/youtu\.be\/([^?]+)/)
    if (shortUrlMatch) return shortUrlMatch[1]
    const embedUrlMatch = url.match(/youtube\.com\/embed\/([^?]+)/)
    if (embedUrlMatch) return embedUrlMatch[1]
    const shortsUrlMatch = url.match(/youtube\.com\/shorts\/([^?]+)/)
    if (shortsUrlMatch) return shortsUrlMatch[1]
    const musicUrlMatch = url.match(/music\.youtube\.com\/watch\?.*v=([^&]+)/)
    if (musicUrlMatch) return musicUrlMatch[1]
    return null
  }


  export const extractYotubePastLink = (url) => {
    // Extract video ID from full URL (e.g., https://www.youtube.com/watch?v=VIDEO_ID)
    const fullUrlMatch = url.match(/[?&]v=([^&]+)/);
    if (fullUrlMatch) return fullUrlMatch[1];
  
    // Extract video ID from short URL (e.g., https://youtu.be/VIDEO_ID)
    const shortUrlMatch = url.match(/youtu\.be\/([^?]+)/);
    if (shortUrlMatch) return shortUrlMatch[1];
  
    // Extract video ID from embed URL (e.g., https://www.youtube.com/embed/VIDEO_ID)
    const embedUrlMatch = url.match(/youtube\.com\/embed\/([^?]+)/);
    if (embedUrlMatch) return embedUrlMatch[1];
  
    // Extract video ID from shorts URL (e.g., https://www.youtube.com/shorts/VIDEO_ID)
    const shortsUrlMatch = url.match(/youtube\.com\/shorts\/([^?]+)/);
    if (shortsUrlMatch) return shortsUrlMatch[1];
  
    // Extract video ID from music URL (e.g., https://music.youtube.com/watch?v=VIDEO_ID)
    const musicUrlMatch = url.match(/music\.youtube\.com\/watch\?.*v=([^&]+)/);
    if (musicUrlMatch) return musicUrlMatch[1];
  
    // Extract playlist ID from playlist URL (e.g., https://www.youtube.com/playlist?list=PLAYLIST_ID)
    const playlistUrlMatch = url.match(/[?&]list=([^&]+)/);
    if (playlistUrlMatch) return playlistUrlMatch[1];
  
    return null;
  };

  // Check if URL is a downloadable video URL (all platforms)
  export const isDownloadableVideoUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    
    const urlLower = url.toLowerCase();
    
    // YouTube patterns
    if (urlLower.includes('youtube.com/watch') || 
        urlLower.includes('youtube.com/shorts/') ||
        urlLower.includes('youtube.com/embed/') ||
        urlLower.includes('youtu.be/') ||
        urlLower.includes('music.youtube.com') ||
        urlLower.includes('youtube.com/playlist') ||
        urlLower.includes('youtubekids.com')) {
      return true;
    }
    
    // Facebook patterns
    if (urlLower.includes('facebook.com/watch') || 
        (urlLower.includes('facebook.com/') && urlLower.includes('/videos/')) ||
        urlLower.includes('fb.com/watch') ||
        urlLower.includes('fb.watch')) {
      return true;
    }
    
    // Instagram patterns
    if (urlLower.includes('instagram.com/p/') ||
        urlLower.includes('instagram.com/reels/') ||
        urlLower.includes('instagram.com/stories/') ||
        urlLower.includes('instagr.am/')) {
      return true;
    }
    
    // TikTok patterns
    if ((urlLower.includes('tiktok.com/@') && urlLower.includes('/video/')) ||
        urlLower.includes('vm.tiktok.com/')) {
      return true;
    }
    
    // Twitter/X patterns
    if ((urlLower.includes('twitter.com/') || urlLower.includes('x.com/')) && 
        urlLower.includes('/status/') ||
        urlLower.includes('t.co/')) {
      return true;
    }
    
    // Twitch patterns
    if (urlLower.includes('twitch.tv/videos/') ||
        (urlLower.includes('twitch.com/') && urlLower.includes('/clip/')) ||
        urlLower.includes('twitch.tv/') && urlLower.includes('/clip/')) {
      return true;
    }
    
    // Dailymotion patterns
    if (urlLower.includes('dailymotion.com/video/') ||
        urlLower.includes('dai.ly/')) {
      return true;
    }
    
    // Other supported platforms
    if (urlLower.includes('vimeo.com/') ||
        urlLower.includes('soundcloud.com/') ||
        urlLower.includes('bilibili.com/') ||
        urlLower.includes('rumble.com/v') ||
        urlLower.includes('bitchute.com/video/') ||
        urlLower.includes('reddit.com/') ||
        urlLower.includes('pinterest.com/') ||
        urlLower.includes('linkedin.com/')) {
      return true;
    }
    
    return false;
  };