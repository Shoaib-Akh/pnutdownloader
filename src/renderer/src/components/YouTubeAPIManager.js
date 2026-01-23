// Enhanced YouTube API integration with better error handling and metadata fetching
import { extractVideoId } from './commonFunction';

class YouTubeAPIManager {
  constructor() {
    this.apiKeys = [
      import.meta.env.VITE_YOUTUBE_API_KEY1,
      import.meta.env.VITE_YOUTUBE_API_KEY2,
      import.meta.env.VITE_YOUTUBE_API_KEY3,
      import.meta.env.VITE_YOUTUBE_API_KEY4,
      import.meta.env.VITE_YOUTUBE_API_KEY5,
    ].filter(key => {
      const isValid = key && key.startsWith('AIza');
      if (!isValid) console.warn('Invalid YouTube API key detected');
      return isValid;
    });
    
    this.currentKeyIndex = parseInt(localStorage.getItem('ytKeyIndex')) || 0;
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
  }

  async fetchJsonWithKeyRotation(urlBuilder) {
    const maxRetries = this.apiKeys.length;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const apiKey = this.getNextApiKey();

      const url = urlBuilder(apiKey);
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 403) {
          console.warn(`API key quota exceeded, trying next key...`);
          continue;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    }

    throw new Error('All YouTube API keys exhausted');
  }

  getNextApiKey() {
    if (this.apiKeys.length === 0) throw new Error("No valid YouTube API keys available");
    
    const key = this.apiKeys[this.currentKeyIndex];
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    
    localStorage.setItem('ytKeyIndex', this.currentKeyIndex.toString());
    return key;
  }

  getCachedData(cacheKey) {
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  setCachedData(cacheKey, data) {
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
  }

  async fetchVideoMetadata(videoId) {
    const cacheKey = `video_${videoId}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    const maxRetries = this.apiKeys.length;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const apiKey = this.getNextApiKey();
      
      try {
        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${apiKey}`
        );
        
        if (!response.ok) {
          if (response.status === 403) {
            console.warn(`API key quota exceeded, trying next key...`);
            continue;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.items.length === 0) {
          throw new Error('Video not found');
        }

        const item = data.items[0];
        const metadata = {
          videoId,
          title: item.snippet.title,
          description: item.snippet.description,
          thumbnail: this.getBestThumbnail(item.snippet.thumbnails),
          duration: item.contentDetails.duration,
          viewCount: item.statistics?.viewCount,
          likeCount: item.statistics?.likeCount,
          publishedAt: item.snippet.publishedAt,
          channelTitle: item.snippet.channelTitle,
          tags: item.snippet.tags || []
        };

        this.setCachedData(cacheKey, metadata);
        return metadata;
        
      } catch (error) {
        console.error(`Attempt ${attempt + 1} failed:`, error.message);
        if (attempt === maxRetries - 1) {
          throw error;
        }
      }
    }
  }

  async fetchPlaylistMetadata(playlistId) {
    const cacheKey = `playlist_${playlistId}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const playlistData = await this.fetchJsonWithKeyRotation((apiKey) =>
        `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&id=${playlistId}&key=${apiKey}`
      );
      
      if (playlistData.items.length === 0) {
        throw new Error('Playlist not found');
      }
      const playlist = playlistData.items[0];

      let pageToken;
      const videos = [];

      do {
        const itemsData = await this.fetchJsonWithKeyRotation((apiKey) => {
          const base = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50&key=${apiKey}`;
          return pageToken ? `${base}&pageToken=${pageToken}` : base;
        });

        const pageVideos = (itemsData.items || []).map(item => ({
          videoId: item.snippet?.resourceId?.videoId,
          title: item.snippet?.title,
          thumbnail: this.getBestThumbnail(item.snippet?.thumbnails),
          position: item.snippet?.position
        })).filter(v => v.videoId);

        videos.push(...pageVideos);
        pageToken = itemsData.nextPageToken;
      } while (pageToken);
      
      const metadata = {
        playlistId,
        title: playlist.snippet.title,
        description: playlist.snippet.description,
        thumbnail: this.getBestThumbnail(playlist.snippet.thumbnails),
        videoCount: playlist.contentDetails?.itemCount || videos.length,
        videos,
        publishedAt: playlist.snippet.publishedAt,
        channelTitle: playlist.snippet.channelTitle
      };

      this.setCachedData(cacheKey, metadata);
      return metadata;
      
    } catch (error) {
      console.error('Playlist fetch failed:', error);
      throw error;
    }
  }

  getBestThumbnail(thumbnails) {
    if (!thumbnails) return null;
    
    const priority = ['maxres', 'standard', 'high', 'medium', 'default'];
    
    for (const size of priority) {
      if (thumbnails[size]) {
        return thumbnails[size].url;
      }
    }
    
    return null;
  }

  async extractVideoInfo(url) {
    const videoId = extractVideoId(url);
    if (!videoId) return null;

    try {
      const metadata = await this.fetchVideoMetadata(videoId);
      
      return {
        videoUrl: url,
        title: this.sanitizeTitle(metadata.title),
        thumbnail: metadata.thumbnail,
        duration: metadata.duration,
        viewCount: metadata.viewCount,
        channelTitle: metadata.channelTitle,
        publishedAt: metadata.publishedAt,
        isPlaylist: false,
        metadata: {
          description: metadata.description,
          tags: metadata.tags,
          likeCount: metadata.likeCount
        }
      };
    } catch (error) {
      console.error('Failed to extract video info:', error);
      return null;
    }
  }

  async extractPlaylistInfo(url) {
    const playlistMatch = url.match(/[?&]list=([^&#]+)/);
    if (!playlistMatch) return null;

    const playlistId = playlistMatch[1];
    
    try {
      const metadata = await this.fetchPlaylistMetadata(playlistId);
      
      return {
        playlistUrl: url,
        playlistTitle: this.sanitizeTitle(metadata.title),
        thumbnail: metadata.thumbnail,
        videoCount: metadata.videoCount,
        videos: metadata.videos,
        isPlaylist: true,
        channelTitle: metadata.channelTitle,
        publishedAt: metadata.publishedAt,
        metadata: {
          description: metadata.description,
          videoPreviews: metadata.videos.slice(0, 3)
        }
      };
    } catch (error) {
      console.error('Failed to extract playlist info:', error);
      return null;
    }
  }

  sanitizeTitle(title) {
    if (!title) return 'Unknown';
    return title
      .replace(/[<>:"/\\|?*]+/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/[^\p{L}\p{N}._-]/gu, ' ')
      .substring(0, 200);
  }
}

// Export singleton instance
export const youtubeAPI = new YouTubeAPIManager();
export default youtubeAPI;
