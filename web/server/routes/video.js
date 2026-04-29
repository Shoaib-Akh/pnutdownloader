const express = require('express');
const router = express.Router();
const YtdlpService = require('../services/YtdlpService');
const FFmpegService = require('../services/FFmpegService');

// Initialize services
let ytdlpService;
let ffmpegService;

router.use((req, res, next) => {
  if (!ytdlpService) {
    ytdlpService = new YtdlpService();
  }
  if (!ffmpegService) {
    ffmpegService = new FFmpegService();
  }
  next();
});

// Fetch video info
router.post('/info', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log('🎬 [VIDEO INFO] Fetching comprehensive video info for:', url);
    const info = await ytdlpService.fetchVideoInfo(url);
    
    // Get FFmpeg information
    let ffmpegVersion = 'Unknown';
    let ffmpegAvailable = false;
    try {
      ffmpegVersion = await ffmpegService.getVersion();
      ffmpegAvailable = true;
      console.log('🔧 [VIDEO INFO] FFmpeg version:', ffmpegVersion);
    } catch (error) {
      console.log('⚠️ [VIDEO INFO] FFmpeg not available:', error.message);
    }
    
    // Enhanced video info with comprehensive details
    const enhancedInfo = {
      // Basic video information
      id: info.id,
      title: info.title,
      description: info.description,
      duration: info.duration,
      duration_string: info.duration_string || info._duration_string,
      
      // Creator information
      uploader: info.uploader,
      uploader_id: info.uploader_id,
      uploader_url: info.uploader_url,
      channel: info.channel,
      channel_id: info.channel_id,
      channel_follower_count: info.channel_follower_count,
      
      // Visual information
      thumbnail: info.thumbnail,
      thumbnails: info.thumbnails,
      
      // Statistics
      view_count: info.view_count,
      like_count: info.like_count,
      dislike_count: info.dislike_count,
      repost_count: info.repost_count,
      average_rating: info.average_rating,
      comment_count: info.comment_count,
      
      // Dates
      upload_date: info.upload_date,
      timestamp: info.timestamp,
      
      // Technical details
      webpage_url: info.webpage_url,
      webpage_url_basename: info.webpage_url_basename,
      original_url: info.original_url,
      playlist: info.playlist,
      playlist_index: info.playlist_index,
      
      // Format information (comprehensive)
      formats: info.formats ? info.formats.map(format => {
        // Get codec information from FFmpeg service
        const videoCodecInfo = format.vcodec && format.vcodec !== 'none' ? 
          ffmpegService.getCodecInfo(format.vcodec.split('.')[0]) : null;
        const audioCodecInfo = format.acodec && format.acodec !== 'none' ? 
          ffmpegService.getCodecInfo(format.acodec.split('.')[0]) : null;
        
        return {
          format_id: format.format_id,
          format_note: format.format_note,
          ext: format.ext,
          acodec: format.acodec,
          vcodec: format.vcodec,
          url: format.url,
          width: format.width,
          height: format.height,
          fps: format.fps,
          filesize: format.filesize,
          filesize_approx: format.filesize_approx,
          filesize_mb: format.filesize ? (format.filesize / 1024 / 1024).toFixed(2) + ' MB' : null,
          tbr: format.tbr,
          vbr: format.vbr,
          abr: format.abr,
          asr: format.asr,
          protocol: format.protocol,
          container: format.container,
          quality: format.quality,
          format: format.format,
          language: format.language,
          language_preference: format.language_preference,
          resolution: format.resolution,
          dynamic_range: format.dynamic_range,
          hdr: format.hdr,
          fps_label: format.fps ? `${format.fps}fps` : null,
          codec_description: format.acodec !== 'none' ? format.acodec : (format.vcodec !== 'none' ? format.vcodec : null),
          
          // Enhanced codec information
          video_codec_info: videoCodecInfo,
          audio_codec_info: audioCodecInfo,
          
          // Format compatibility
          ffmpeg_supported: ffmpegAvailable && ffmpegService.isFormatSupported(format.ext),
          
          // Quality indicators
          quality_score: calculateQualityScore(format),
          
          // Stream type classification
          stream_type: getStreamType(format),
          
          // Recommended usage
          recommended_for: getRecommendedUsage(format)
        };
      }) : [],
      
      // Additional metadata
      categories: info.categories,
      tags: info.tags,
      is_live: info.is_live,
      was_live: info.was_live,
      live_status: info.live_status,
      availability: info.availability,
      playable_in_embed: info.playable_in_embed,
      
      // Subtitle information
      subtitles: info.subtitles,
      automatic_captions: info.automatic_captions,
      
      // Chapter information
      chapters: info.chapters,
      
      // yt-dlp specific info
      extractor: info.extractor,
      extractor_key: info.extractor_key,
      ie_key: info.ie_key,
      
      // Format selection helpers
      requested_formats: info.requested_formats,
      requested_subtitles: info.requested_subtitles,
      
      // Audio/Video stream details
      audio_ext: info.audio_ext,
      video_ext: info.video_ext,
      
      // Quality indicators
      quality_order: info.quality_order,
      
      // Age restriction
      age_limit: info.age_limit,
      
      // Location info
      location: info.location,
      
      // ffmpeg compatibility info
      ffmpeg_version_available: ffmpegAvailable,
      ffmpeg_version: ffmpegVersion,
      supported_containers: ['mp4', 'webm', 'mkv', 'avi', 'mov', 'flv', 'wmv'],
      supported_audio_formats: ['mp3', 'aac', 'ogg', 'wav', 'flac', 'm4a', 'opus'],
      supported_video_formats: ['mp4', 'webm', 'mkv', 'avi', 'mov', 'flv'],
      
      // yt-dlp and ffmpeg integration info
      processing_capabilities: {
        video_decoding: ffmpegAvailable,
        audio_decoding: ffmpegAvailable,
        format_conversion: ffmpegAvailable,
        codec_support: ffmpegAvailable ? 'Full' : 'Limited',
        hardware_acceleration: ffmpegAvailable ? 'Available' : 'Not Available'
      }
    };

    console.log('✅ [VIDEO INFO] Enhanced video info fetched successfully');
    console.log('📊 [VIDEO INFO] Formats found:', enhancedInfo.formats.length);
    console.log('🎵 [VIDEO INFO] Audio formats:', enhancedInfo.formats.filter(f => f.acodec !== 'none').length);
    console.log('🎬 [VIDEO INFO] Video formats:', enhancedInfo.formats.filter(f => f.vcodec !== 'none').length);
    
    res.json(enhancedInfo);
  } catch (error) {
    console.error('❌ [VIDEO INFO] Error fetching video info:', error);
    res.status(500).json({ error: error.message });
  }
});

// Fetch playlist entries
router.post('/playlist', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const entries = await ytdlpService.fetchPlaylistEntries(url);
    res.json(entries);
  } catch (error) {
    console.error('Playlist entries error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get YouTube-specific info (maintains compatibility with existing frontend)
router.post('/youtube', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const info = await ytdlpService.fetchVideoInfo(url);
    
    // Transform to match expected format from frontend
    const transformedInfo = {
      id: info.id,
      title: info.title,
      description: info.description,
      duration: info.duration,
      uploader: info.uploader,
      uploader_id: info.uploader_id,
      thumbnail: info.thumbnail,
      view_count: info.view_count,
      like_count: info.like_count,
      formats: info.formats,
      webpage_url: info.webpage_url
    };

    res.json(transformedInfo);
  } catch (error) {
    console.error('YouTube info error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper methods for format analysis
function calculateQualityScore(format) {
  let score = 0;
  
  // Resolution score
  if (format.height) {
    if (format.height >= 2160) score += 40; // 4K
    else if (format.height >= 1440) score += 35; // 2K
    else if (format.height >= 1080) score += 30; // 1080p
    else if (format.height >= 720) score += 25; // 720p
    else if (format.height >= 480) score += 20; // 480p
    else score += 10; // Lower resolutions
  }
  
  // FPS score
  if (format.fps) {
    if (format.fps >= 60) score += 15;
    else if (format.fps >= 30) score += 10;
    else score += 5;
  }
  
  // Codec score
  if (format.vcodec) {
    if (format.vcodec.includes('av01') || format.vcodec.includes('av1')) score += 20;
    else if (format.vcodec.includes('vp9')) score += 15;
    else if (format.vcodec.includes('h264') || format.vcodec.includes('avc1')) score += 10;
    else if (format.vcodec.includes('h265') || format.vcodec.includes('hevc')) score += 18;
  }
  
  // Audio codec score
  if (format.acodec && format.acodec !== 'none') {
    if (format.acodec.includes('opus')) score += 10;
    else if (format.acodec.includes('aac')) score += 8;
    else if (format.acodec.includes('mp3')) score += 5;
  }
  
  // File size consideration (smaller is better for same quality)
  if (format.filesize && format.height) {
    const sizePerMB = format.filesize / (format.height * format.height / 10000);
    if (sizePerMB < 0.5) score += 5;
    else if (sizePerMB > 2) score -= 5;
  }
  
  return Math.max(0, Math.min(100, score));
}

function getStreamType(format) {
  if (format.vcodec !== 'none' && format.acodec !== 'none') {
    return 'Video + Audio';
  } else if (format.vcodec !== 'none') {
    return 'Video Only';
  } else if (format.acodec !== 'none') {
    return 'Audio Only';
  } else {
    return 'Unknown';
  }
}

function getRecommendedUsage(format) {
  const recommendations = [];
  
  if (format.vcodec !== 'none') {
    if (format.height >= 1080) {
      recommendations.push('High Quality Viewing');
    }
    if (format.height >= 720) {
      recommendations.push('Streaming');
    }
    if (format.fps >= 60) {
      recommendations.push('Gaming/Action Content');
    }
  }
  
  if (format.acodec !== 'none') {
    if (format.acodec.includes('opus') || format.acodec.includes('aac')) {
      recommendations.push('Music/Audio');
    }
  }
  
  if (format.ext === 'mp4') {
    recommendations.push('Universal Compatibility');
  } else if (format.ext === 'webm') {
    recommendations.push('Web Optimization');
  }
  
  if (!recommendations.length) {
    return ['General Use'];
  }
  
  return recommendations;
}

module.exports = router;
