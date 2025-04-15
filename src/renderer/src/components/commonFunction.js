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