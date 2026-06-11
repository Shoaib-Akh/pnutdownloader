// Non-YouTube metadata extractor using file data and time-based information
import { detectPlatform } from './platformUtils';

const SPOTIFY_TRACK_UNSUPPORTED_MESSAGE = 'Spotify track downloads are not supported because Spotify tracks are DRM-protected.';
const isSpotifyTrackUrl = (url) => /open\.spotify\.com\/track\/|spotify\.com\/track\//i.test(url || '');

class NonYouTubeMetadataExtractor {
  constructor() {
    this.platformConfigs = {
      instagram: {
        name: 'Instagram',
        patterns: [
          /instagram\.com\/p\/([^\/]+)/,
          /instagram\.com\/reel\/([^\/]+)/
        ],
        metadataExtractor: this.extractInstagramMetadata.bind(this)
      },
      snapchat: {
        name: 'Snapchat',
        patterns: [
          /snapchat\.com\/spotlight\/([^\/?#]+)/,
          /snapchat\.com\/stories\/[^\/]+\/([^\/?#]+)/,
          /story\.snapchat\.com\/(?:p|spotlight|story)\/([^\/?#]+)/
        ],
        metadataExtractor: this.extractSnapchatMetadata.bind(this)
      },
      facebook: {
        name: 'Facebook',
        patterns: [
          /facebook\.com\/.*\/videos\/([^\/]+)/,
          /fb\.watch\/([^\/]+)/
        ],
        metadataExtractor: this.extractFacebookMetadata.bind(this)
      },
      twitter: {
        name: 'Twitter/X',
        patterns: [
          /twitter\.com\/.*\/status\/([^\/]+)/,
          /x\.com\/.*\/status\/([^\/]+)/
        ],
        metadataExtractor: this.extractTwitterMetadata.bind(this)
      },
      tiktok: {
        name: 'TikTok',
        patterns: [
          /tiktok\.com\/@[^\/]+\/video\/([^\/]+)/,
          /vm\.tiktok\.com\/([^\/]+)/
        ],
        metadataExtractor: this.extractTikTokMetadata.bind(this)
      },
      vimeo: {
        name: 'Vimeo',
        patterns: [
          /vimeo\.com\/([^\/]+)/
        ],
        metadataExtractor: this.extractVimeoMetadata.bind(this)
      },
      dailymotion: {
        name: 'Dailymotion',
        patterns: [
          /dailymotion\.com\/video\/([^\/]+)/
        ],
        metadataExtractor: this.extractDailymotionMetadata.bind(this)
      },
      reddit: {
        name: 'Reddit',
        patterns: [
          /reddit\.com\/r\/[^\/]+\/comments\/([^\/]+)/
        ],
        metadataExtractor: this.extractRedditMetadata.bind(this)
      },
      twitch: {
        name: 'Twitch',
        patterns: [
          /twitch\.tv\/videos\/([^\/]+)/,
          /twitch\.tv\/[^\/]+\/clip\/([^\/]+)/,
          /twitch\.tv\/[^\/]+\/v\/([^\/]+)/
        ],
        metadataExtractor: this.extractTwitchMetadata.bind(this)
      },
      soundcloud: {
        name: 'SoundCloud',
        patterns: [
          /soundcloud\.com\/[^\/]+\/([^\/?#]+)/
        ],
        metadataExtractor: this.extractSoundCloudMetadata.bind(this)
      },
      spotify: {
        name: 'Spotify',
        patterns: [
          /open\.spotify\.com\/(?:track|episode|show|playlist|album)\/([^\/?#]+)/,
          /spotify\.link\/([^\/?#]+)/
        ],
        metadataExtractor: this.extractSpotifyMetadata.bind(this)
      },
      bilibili: {
        name: 'Bilibili',
        patterns: [
          /bilibili\.com\/video\/(BV[a-zA-Z0-9]+)/
        ],
        metadataExtractor: this.extractBilibiliMetadata.bind(this)
      }
    };
  }

  async extractMetadata(url) {
    const platform = this.detectPlatformFromUrl(url);
    if (!platform) {
      return this.generateGenericMetadata(url);
    }

    const config = this.platformConfigs[platform];
    if (!config) {
      return this.generateGenericMetadata(url);
    }

    try {
      // First try to get video info from yt-dlp
      const ytDlpInfo = await this.extractFromYtDlp(url);
      if (ytDlpInfo) {
        return ytDlpInfo;
      }
    } catch (error) {
      console.warn(`yt-dlp extraction failed for ${platform}:`, error);
    }

    // Fallback to platform-specific extraction
    try {
      return await config.metadataExtractor(url);
    } catch (error) {
      console.error(`Platform-specific extraction failed for ${platform}:`, error);
      return this.generateGenericMetadata(url, platform);
    }
  }

  detectPlatformFromUrl(url) {
    for (const [platform, config] of Object.entries(this.platformConfigs)) {
      if (config.patterns.some(pattern => pattern.test(url))) {
        return platform;
      }
    }
    return null;
  }

  async extractFromYtDlp(url) {
    try {
      if (!window.api?.fetchVideoInfo) {
        console.warn('yt-dlp API not available');
        return null;
      }

      const info = await window.api.fetchVideoInfo(url);
      if (!info) {
        console.warn('No info returned from yt-dlp');
        return null;
      }

      const platform = this.detectPlatformFromUrl(url);

      // Extract thumbnail from yt-dlp response
      let thumbnail = '';
      if (Array.isArray(info.thumbnails) && info.thumbnails.length > 0) {
        thumbnail = info.thumbnails[info.thumbnails.length - 1].url;
      } else if (info.thumbnail) {
        thumbnail = info.thumbnail;
      }

      // Format duration from seconds to ISO format
      const duration = this.formatDuration(info.duration);

      return {
        videoUrl: url,
        title: this.sanitizeTitle(info.title) || `${platform} Video`,
        thumbnail: thumbnail,
        duration: duration || 'PT0S',
        platform: platform || 'Unknown',
        resourceId: info.id || this.extractResourceId(url)?.id || null,
        unsupportedDownload: Boolean(info.unsupportedDownload),
        unsupportedReason: info.unsupportedReason || null,
        metadata: {
          uploader: info.uploader || 'Unknown User',
          description: info.description || '',
          uploadDate: info.upload_date || null,
          duration: info.duration,
          viewCount: info.view_count,
          likeCount: info.like_count,
          extractor: 'yt-dlp'
        }
      };
    } catch (error) {
      console.error('yt-dlp extraction failed:', error);
      return null;
    }
  }

  async extractInstagramMetadata(url) {
    try {
      // Try to get basic info from yt-dlp first
      const info = await window.api?.fetchVideoInfo(url);
      if (info) {
        return {
          videoUrl: url,
          title: this.sanitizeTitle(info.title) || 'Instagram Video',
          thumbnail: info.thumbnail || this.generatePlaceholderThumbnail('instagram'),
          duration: this.formatDuration(info.duration) || 'PT0S',
          platform: 'Instagram',
          resourceId: this.extractResourceId(url)?.id || null,
          metadata: {
            uploader: info.uploader || 'Unknown User',
            description: info.description || '',
            uploadDate: info.upload_date || null
          }
        };
      }
    } catch (error) {
      console.warn('yt-dlp extraction failed for Instagram:', error);
    }

    // Fallback to URL-based extraction
    const match = url.match(/instagram\.com\/(?:p|reel)\/([^\/]+)/);
    const postId = match ? match[1] : 'unknown';
    
    return {
      videoUrl: url,
      title: `Instagram Post - ${postId.substring(0, 8)}`,
      thumbnail: this.generatePlaceholderThumbnail('instagram'),
      duration: 'PT0S',
      platform: 'Instagram',
      resourceId: postId,
      metadata: {
        postId,
        extractedAt: new Date().toISOString()
      }
    };
  }

  async extractFacebookMetadata(url) {
    try {
      const info = await window.api?.fetchVideoInfo(url);
      if (info) {
        return {
          videoUrl: url,
          title: this.sanitizeTitle(info.title) || 'Facebook Video',
          thumbnail: info.thumbnail || this.generatePlaceholderThumbnail('facebook'),
          duration: this.formatDuration(info.duration) || 'PT0S',
          platform: 'Facebook',
          resourceId: this.extractResourceId(url)?.id || null,
          metadata: {
            uploader: info.uploader || 'Unknown',
            description: info.description || '',
            uploadDate: info.upload_date || null
          }
        };
      }
    } catch (error) {
      console.warn('yt-dlp extraction failed for Facebook:', error);
    }

    const match = url.match(/facebook\.com\/.*\/videos\/([^\/]+)/);
    const videoId = match ? match[1] : 'unknown';
    
    return {
      videoUrl: url,
      title: `Facebook Video - ${videoId.substring(0, 8)}`,
      thumbnail: this.generatePlaceholderThumbnail('facebook'),
      duration: 'PT0S',
      platform: 'Facebook',
      resourceId: videoId,
      metadata: {
        videoId,
        extractedAt: new Date().toISOString()
      }
    };
  }

  async extractSnapchatMetadata(url) {
    try {
      const info = await window.api?.fetchVideoInfo(url);
      if (info) {
        return {
          videoUrl: url,
          title: this.sanitizeTitle(info.title) || 'Snapchat Video',
          thumbnail: info.thumbnail || this.generatePlaceholderThumbnail('snapchat'),
          duration: this.formatDuration(info.duration) || 'PT0S',
          platform: 'Snapchat',
          resourceId: this.extractResourceId(url)?.id || null,
          metadata: {
            uploader: info.uploader || 'Unknown Creator',
            description: info.description || '',
            uploadDate: info.upload_date || null
          }
        };
      }
    } catch (error) {
      console.warn('yt-dlp extraction failed for Snapchat:', error);
    }

    const resourceId = this.extractResourceId(url)?.id || 'unknown';

    return {
      videoUrl: url,
      title: `Snapchat Video - ${resourceId.substring(0, 8)}`,
      thumbnail: this.generatePlaceholderThumbnail('snapchat'),
      duration: 'PT0S',
      platform: 'Snapchat',
      resourceId,
      metadata: {
        resourceId,
        extractedAt: new Date().toISOString()
      }
    };
  }

  async extractTwitterMetadata(url) {
    try {
      const info = await window.api?.fetchVideoInfo(url);
      if (info) {
        return {
          videoUrl: url,
          title: this.sanitizeTitle(info.title) || 'Twitter Video',
          thumbnail: info.thumbnail || this.generatePlaceholderThumbnail('twitter'),
          duration: this.formatDuration(info.duration) || 'PT0S',
          platform: 'Twitter/X',
          resourceId: this.extractResourceId(url)?.id || null,
          metadata: {
            uploader: info.uploader || 'Unknown User',
            description: info.description || '',
            uploadDate: info.upload_date || null
          }
        };
      }
    } catch (error) {
      console.warn('yt-dlp extraction failed for Twitter:', error);
    }

    const match = url.match(/(?:twitter|x)\.com\/.*\/status\/([^\/]+)/);
    const statusId = match ? match[1] : 'unknown';
    
    return {
      videoUrl: url,
      title: `Twitter Post - ${statusId.substring(0, 8)}`,
      thumbnail: this.generatePlaceholderThumbnail('twitter'),
      duration: 'PT0S',
      platform: 'Twitter/X',
      resourceId: statusId,
      metadata: {
        statusId,
        extractedAt: new Date().toISOString()
      }
    };
  }

  async extractTikTokMetadata(url) {
    try {
      const info = await window.api?.fetchVideoInfo(url);
      if (info) {
        return {
          videoUrl: url,
          title: this.sanitizeTitle(info.title) || 'TikTok Video',
          thumbnail: info.thumbnail || this.generatePlaceholderThumbnail('tiktok'),
          duration: this.formatDuration(info.duration) || 'PT0S',
          platform: 'TikTok',
          resourceId: this.extractResourceId(url)?.id || null,
          metadata: {
            uploader: info.uploader || 'Unknown Creator',
            description: info.description || '',
            uploadDate: info.upload_date || null
          }
        };
      }
    } catch (error) {
      console.warn('yt-dlp extraction failed for TikTok:', error);
    }

    const match = url.match(/tiktok\.com\/@[^\/]+\/video\/([^\/]+)/);
    const videoId = match ? match[1] : 'unknown';
    
    return {
      videoUrl: url,
      title: `TikTok Video - ${videoId.substring(0, 8)}`,
      thumbnail: this.generatePlaceholderThumbnail('tiktok'),
      duration: 'PT0S',
      platform: 'TikTok',
      resourceId: videoId,
      metadata: {
        videoId,
        extractedAt: new Date().toISOString()
      }
    };
  }

  async extractVimeoMetadata(url) {
    try {
      const info = await window.api?.fetchVideoInfo(url);
      if (info) {
        return {
          videoUrl: url,
          title: this.sanitizeTitle(info.title) || 'Vimeo Video',
          thumbnail: info.thumbnail || this.generatePlaceholderThumbnail('vimeo'),
          duration: this.formatDuration(info.duration) || 'PT0S',
          platform: 'Vimeo',
          resourceId: this.extractResourceId(url)?.id || null,
          metadata: {
            uploader: info.uploader || 'Unknown Creator',
            description: info.description || '',
            uploadDate: info.upload_date || null
          }
        };
      }
    } catch (error) {
      console.warn('yt-dlp extraction failed for Vimeo:', error);
    }

    const match = url.match(/vimeo\.com\/([^\/]+)/);
    const videoId = match ? match[1] : 'unknown';
    
    return {
      videoUrl: url,
      title: `Vimeo Video - ${videoId.substring(0, 8)}`,
      thumbnail: this.generatePlaceholderThumbnail('vimeo'),
      duration: 'PT0S',
      platform: 'Vimeo',
      resourceId: videoId,
      metadata: {
        videoId,
        extractedAt: new Date().toISOString()
      }
    };
  }

  async extractDailymotionMetadata(url) {
    try {
      const info = await window.api?.fetchVideoInfo(url);
      if (info) {
        return {
          videoUrl: url,
          title: this.sanitizeTitle(info.title) || 'Dailymotion Video',
          thumbnail: info.thumbnail || this.generatePlaceholderThumbnail('dailymotion'),
          duration: this.formatDuration(info.duration) || 'PT0S',
          platform: 'Dailymotion',
          resourceId: this.extractResourceId(url)?.id || null,
          metadata: {
            uploader: info.uploader || 'Unknown Uploader',
            description: info.description || '',
            uploadDate: info.upload_date || null
          }
        };
      }
    } catch (error) {
      console.warn('yt-dlp extraction failed for Dailymotion:', error);
    }

    const match = url.match(/dailymotion\.com\/video\/([^\/]+)/);
    const videoId = match ? match[1] : 'unknown';
    
    return {
      videoUrl: url,
      title: `Dailymotion Video - ${videoId.substring(0, 8)}`,
      thumbnail: this.generatePlaceholderThumbnail('dailymotion'),
      duration: 'PT0S',
      platform: 'Dailymotion',
      resourceId: videoId,
      metadata: {
        videoId,
        extractedAt: new Date().toISOString()
      }
    };
  }

  async extractRedditMetadata(url) {
    try {
      const info = await window.api?.fetchVideoInfo(url);
      if (info) {
        return {
          videoUrl: url,
          title: this.sanitizeTitle(info.title) || 'Reddit Video',
          thumbnail: info.thumbnail || this.generatePlaceholderThumbnail('generic'),
          duration: this.formatDuration(info.duration) || 'PT0S',
          platform: 'Reddit',
          resourceId: this.extractResourceId(url)?.id || null,
          metadata: {
            uploader: info.uploader || 'Unknown',
            description: info.description || '',
            uploadDate: info.upload_date || null
          }
        };
      }
    } catch (error) {
      console.warn('yt-dlp extraction failed for Reddit:', error);
    }

    const match = url.match(/reddit\.com\/r\/[^\/]+\/comments\/([^\/]+)/);
    const postId = match ? match[1] : 'unknown';
    
    return {
      videoUrl: url,
      title: `Reddit Post - ${postId.substring(0, 8)}`,
      thumbnail: this.generatePlaceholderThumbnail('generic'),
      duration: 'PT0S',
      platform: 'Reddit',
      resourceId: postId,
      metadata: {
        postId,
        extractedAt: new Date().toISOString()
      }
    };
  }

  async extractTwitchMetadata(url) {
    try {
      const info = await window.api?.fetchVideoInfo(url);
      if (info) {
        return {
          videoUrl: url,
          title: this.sanitizeTitle(info.title) || 'Twitch Video',
          thumbnail: info.thumbnail || this.generatePlaceholderThumbnail('generic'),
          duration: this.formatDuration(info.duration) || 'PT0S',
          platform: 'Twitch',
          resourceId: this.extractResourceId(url)?.id || null,
          metadata: {
            uploader: info.uploader || 'Unknown',
            description: info.description || '',
            uploadDate: info.upload_date || null
          }
        };
      }
    } catch (error) {
      console.warn('yt-dlp extraction failed for Twitch:', error);
    }

    let match = url.match(/twitch\.tv\/videos\/([^\/]+)/);
    if (!match) match = url.match(/twitch\.tv\/[^\/]+\/clip\/([^\/]+)/);
    const videoId = match ? match[1] : 'unknown';
    
    return {
      videoUrl: url,
      title: `Twitch Video - ${videoId.substring(0, 8)}`,
      thumbnail: this.generatePlaceholderThumbnail('generic'),
      duration: 'PT0S',
      platform: 'Twitch',
      resourceId: videoId,
      metadata: {
        videoId,
        extractedAt: new Date().toISOString()
      }
    };
  }

  async extractSoundCloudMetadata(url) {
    try {
      const info = await window.api?.fetchVideoInfo(url);
      if (info) {
        return {
          videoUrl: url,
          title: this.sanitizeTitle(info.title) || 'SoundCloud Track',
          thumbnail: info.thumbnail || this.generatePlaceholderThumbnail('generic'),
          duration: this.formatDuration(info.duration) || 'PT0S',
          platform: 'SoundCloud',
          resourceId: this.extractResourceId(url)?.id || null,
          metadata: {
            uploader: info.uploader || 'Unknown',
            description: info.description || '',
            uploadDate: info.upload_date || null
          }
        };
      }
    } catch (error) {
      console.warn('yt-dlp extraction failed for SoundCloud:', error);
    }

    const match = url.match(/soundcloud\.com\/[^\/]+\/([^\/?#]+)/);
    const trackSlug = match ? match[1] : 'unknown';
    
    return {
      videoUrl: url,
      title: `SoundCloud Track - ${trackSlug.substring(0, 8)}`,
      thumbnail: this.generatePlaceholderThumbnail('generic'),
      duration: 'PT0S',
      platform: 'SoundCloud',
      resourceId: trackSlug,
      metadata: {
        trackSlug,
        extractedAt: new Date().toISOString()
      }
    };
  }

  async extractBilibiliMetadata(url) {
    try {
      const info = await window.api?.fetchVideoInfo(url);
      if (info) {
        return {
          videoUrl: url,
          title: this.sanitizeTitle(info.title) || 'Bilibili Video',
          thumbnail: info.thumbnail || this.generatePlaceholderThumbnail('generic'),
          duration: this.formatDuration(info.duration) || 'PT0S',
          platform: 'Bilibili',
          resourceId: this.extractResourceId(url)?.id || null,
          metadata: {
            uploader: info.uploader || 'Unknown',
            description: info.description || '',
            uploadDate: info.upload_date || null
          }
        };
      }
    } catch (error) {
      console.warn('yt-dlp extraction failed for Bilibili:', error);
    }

    const match = url.match(/bilibili\.com\/video\/(BV[a-zA-Z0-9]+)/);
    const videoId = match ? match[1] : 'unknown';
    
    return {
      videoUrl: url,
      title: `Bilibili Video - ${videoId.substring(0, 8)}`,
      thumbnail: this.generatePlaceholderThumbnail('generic'),
      duration: 'PT0S',
      platform: 'Bilibili',
      resourceId: videoId,
      metadata: {
        videoId,
        extractedAt: new Date().toISOString()
      }
    };
  }

  async extractSpotifyMetadata(url) {
    try {
      const info = await window.api?.fetchVideoInfo(url);
      if (info) {
        return {
          videoUrl: url,
          title: this.sanitizeTitle(info.title) || 'Spotify Audio',
          thumbnail: info.thumbnail || this.generatePlaceholderThumbnail('spotify'),
          duration: this.formatDuration(info.duration) || 'PT0S',
          platform: 'Spotify',
          resourceId: this.extractResourceId(url)?.id || null,
          unsupportedDownload: Boolean(info.unsupportedDownload),
          unsupportedReason: info.unsupportedReason || (isSpotifyTrackUrl(url) ? SPOTIFY_TRACK_UNSUPPORTED_MESSAGE : null),
          metadata: {
            uploader: info.uploader || info.artist || 'Unknown Artist',
            description: info.description || '',
            uploadDate: info.upload_date || null
          }
        };
      }
    } catch (error) {
      console.warn('yt-dlp extraction failed for Spotify:', error);
    }

    const resourceId = this.extractResourceId(url)?.id || 'unknown';

    return {
      videoUrl: url,
      title: `Spotify Audio - ${resourceId.substring(0, 8)}`,
      thumbnail: this.generatePlaceholderThumbnail('spotify'),
      duration: 'PT0S',
      platform: 'Spotify',
      resourceId,
      unsupportedDownload: isSpotifyTrackUrl(url),
      unsupportedReason: isSpotifyTrackUrl(url) ? SPOTIFY_TRACK_UNSUPPORTED_MESSAGE : null,
      metadata: {
        resourceId,
        extractedAt: new Date().toISOString()
      }
    };
  }

  generateGenericMetadata(url, platform = 'Unknown') {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');
    
    return {
      videoUrl: url,
      title: `${platform} Video - ${domain}`,
      thumbnail: this.generatePlaceholderThumbnail('generic'),
      duration: 'PT0S',
      platform: platform || 'Unknown Platform',
      metadata: {
        domain,
        extractedAt: new Date().toISOString(),
        urlHash: this.hashUrl(url)
      }
    };
  }

  generatePlaceholderThumbnail(platform) {
    // Generate SVG placeholder thumbnails for different platforms
    const svgTemplates = {
      instagram: `<svg width="120" height="70" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="ig" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#E4405F"/><stop offset="100%" style="stop-color:#833AB4"/></linearGradient></defs><rect width="120" height="70" fill="url(#ig)"/><text x="60" y="40" text-anchor="middle" fill="white" font-family="Arial" font-size="10" font-weight="bold">Instagram</text></svg>`,
      facebook: `<svg width="120" height="70" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="fb" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#1877F2"/><stop offset="100%" style="stop-color:#0C63D4"/></linearGradient></defs><rect width="120" height="70" fill="url(#fb)"/><text x="60" y="40" text-anchor="middle" fill="white" font-family="Arial" font-size="10" font-weight="bold">Facebook</text></svg>`,
      snapchat: `<svg width="120" height="70" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="70" fill="#FFFC00"/><text x="60" y="40" text-anchor="middle" fill="#111111" font-family="Arial" font-size="10" font-weight="bold">Snapchat</text></svg>`,
      twitter: `<svg width="120" height="70" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="tw" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#1DA1F2"/><stop offset="100%" style="stop-color:#1A91DA"/></linearGradient></defs><rect width="120" height="70" fill="url(#tw)"/><text x="60" y="40" text-anchor="middle" fill="white" font-family="Arial" font-size="10" font-weight="bold">Twitter/X</text></svg>`,
      tiktok: `<svg width="120" height="70" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="tt" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#000000"/><stop offset="50%" style="stop-color:#FF0050"/><stop offset="100%" style="stop-color:#00F2EA"/></linearGradient></defs><rect width="120" height="70" fill="url(#tt)"/><text x="60" y="40" text-anchor="middle" fill="white" font-family="Arial" font-size="10" font-weight="bold">TikTok</text></svg>`,
      vimeo: `<svg width="120" height="70" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="vm" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#00ADFF"/><stop offset="100%" style="stop-color:#0066CC"/></linearGradient></defs><rect width="120" height="70" fill="url(#vm)"/><text x="60" y="40" text-anchor="middle" fill="white" font-family="Arial" font-size="10" font-weight="bold">Vimeo</text></svg>`,
      dailymotion: `<svg width="120" height="70" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="dm" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#00A3E0"/><stop offset="100%" style="stop-color:#006699"/></linearGradient></defs><rect width="120" height="70" fill="url(#dm)"/><text x="60" y="40" text-anchor="middle" fill="white" font-family="Arial" font-size="10" font-weight="bold">Dailymotion</text></svg>`,
      spotify: `<svg width="120" height="70" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="sp" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#1DB954"/><stop offset="100%" style="stop-color:#0B7D38"/></linearGradient></defs><rect width="120" height="70" fill="url(#sp)"/><text x="60" y="40" text-anchor="middle" fill="white" font-family="Arial" font-size="10" font-weight="bold">Spotify</text></svg>`,
      generic: `<svg width="120" height="70" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="gen" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#667eea"/><stop offset="100%" style="stop-color:#764ba2"/></linearGradient></defs><rect width="120" height="70" fill="url(#gen)"/><text x="60" y="35" text-anchor="middle" fill="white" font-family="Arial" font-size="8" font-weight="bold">Video</text><text x="60" y="45" text-anchor="middle" fill="white" font-family="Arial" font-size="6">Loading...</text></svg>`
    };

    const svg = svgTemplates[platform] || svgTemplates.generic;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  formatDuration(seconds) {
    if (!seconds || typeof seconds !== 'number') return null;
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    let isoDuration = 'PT';
    if (hours > 0) isoDuration += `${hours}H`;
    if (minutes > 0) isoDuration += `${minutes}M`;
    if (secs > 0) isoDuration += `${secs}S`;
    
    return isoDuration || 'PT0S';
  }

  sanitizeTitle(title) {
    if (!title) return null;
    return title
      .replace(/[<>:"/\\|?*]+/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/[^\p{L}\p{N}._-]/gu, ' ')
      .substring(0, 200);
  }

  hashUrl(url) {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  extractResourceId(url) {
    const platform = this.detectPlatformFromUrl(url);
    if (!platform || !this.platformConfigs[platform]) return null;

    const config = this.platformConfigs[platform];
    for (const pattern of config.patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return { platform, id: match[1] };
      }
    }
    return null;
  }
}

// Export singleton instance
export const nonYouTubeExtractor = new NonYouTubeMetadataExtractor();
export default nonYouTubeExtractor;
