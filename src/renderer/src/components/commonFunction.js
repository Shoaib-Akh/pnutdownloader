import { extractVideoId as sharedExtractVideoId, isDownloadableVideoUrl as sharedIsDownloadable } from '../../../shared/platformUtils'

/** Normalize URL for comparison (strip tracking params). */
export const normalizeUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  try {
    const u = new URL(url);
    u.searchParams.delete('si');
    u.searchParams.delete('feature');
    u.searchParams.delete('ab_channel');
    return u.toString();
  } catch {
    return url;
  }
};

/** True if both URLs refer to the same video. YouTube: by video/playlist ID; others: normalized URL. */
export const isSameVideo = (urlA, urlB) => {
  const a = extractYotubePastLink(urlA);
  const b = extractYotubePastLink(urlB);
  if (a && b) return a === b;
  return normalizeUrl(urlA) === normalizeUrl(urlB);
};

/**
 * True if list has an item with same video AND same format, quality, saveTo, downloadType, bitrate.
 * Only then count as duplicate; different settings = allow new download.
 */
export const isDuplicateDownload = (list, url, format, quality, saveTo, downloadType, bitrate) => {
  const f = (v) => (v ?? '').toString().toLowerCase();
  const b = (v) => (v ? f(v) : 'null');
  return list.some(
    (item) =>
      isSameVideo(item.url, url) &&
      f(item.format) === f(format) &&
      f(item.quality) === f(quality) &&
      f(item.saveTo) === f(saveTo) &&
      f(item.downloadType) === f(downloadType) &&
      b(item.bitrate) === b(bitrate)
  );
};

export const extractVideoId = (url) => sharedExtractVideoId(url)

// Re-export from shared utils to avoid duplication
export const isDownloadableVideoUrl = (url) => sharedIsDownloadable(url)


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

