const { spawn } = require('child_process');

class FFmpegService {
  constructor() {
    this.ffmpegPath = this.getFFmpegPath();
  }

  getFFmpegPath() {
    console.log('🔍 [FFMPEG] Looking for ffmpeg executable...');
    
    // Check common system locations
    const systemPaths = ['/usr/local/bin/ffmpeg', '/usr/bin/ffmpeg', '/opt/homebrew/bin/ffmpeg'];
    for (const systemPath of systemPaths) {
      console.log('🔍 [FFMPEG] Checking system path:', systemPath);
      try {
        require('fs').accessSync(systemPath);
        console.log('✅ [FFMPEG] Found ffmpeg at:', systemPath);
        return systemPath;
      } catch {
        // Continue checking
      }
    }
    
    // Fallback to system ffmpeg in PATH
    try {
      const whichResult = require('child_process').execSync('which ffmpeg', { encoding: 'utf8' }).trim();
      console.log('✅ [FFMPEG] Found ffmpeg in PATH at:', whichResult);
      return 'ffmpeg';
    } catch (error) {
      console.error('❌ [FFMPEG] ffmpeg not found. Please install ffmpeg first.');
      console.error('❌ [FFMPEG] Install with: brew install ffmpeg or apt-get install ffmpeg');
      throw new Error('ffmpeg not found. Please install ffmpeg using: brew install ffmpeg or apt-get install ffmpeg');
    }
  }

  async getVersion() {
    return new Promise((resolve, reject) => {
      const process = spawn(this.ffmpegPath, ['-version']);
      let output = '';
      
      process.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          const versionMatch = output.match(/ffmpeg version ([\d.]+)/);
          resolve(versionMatch ? versionMatch[1] : 'Unknown');
        } else {
          reject(new Error('Failed to get ffmpeg version'));
        }
      });
    });
  }

  async getSupportedFormats() {
    return new Promise((resolve, reject) => {
      const process = spawn(this.ffmpegPath, ['-formats']);
      let output = '';
      
      process.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          const lines = output.split('\n');
          const formats = [];
          
          for (const line of lines) {
            if (line.startsWith(' D') || line.startsWith(' E')) {
              const parts = line.trim().split(/\s+/);
              if (parts.length >= 2) {
                formats.push({
                  demuxing: line.startsWith(' D'),
                  muxing: line.startsWith(' E'),
                  name: parts[1],
                  description: parts.slice(2).join(' ')
                });
              }
            }
          }
          
          resolve(formats);
        } else {
          reject(new Error('Failed to get supported formats'));
        }
      });
    });
  }

  async getSupportedCodecs() {
    return new Promise((resolve, reject) => {
      const process = spawn(this.ffmpegPath, ['-codecs']);
      let output = '';
      
      process.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      process.on('close', (code) => {
        if (code === 0) {
          const lines = output.split('\n');
          const codecs = [];
          
          for (const line of lines) {
            if (line.startsWith(' D') || line.startsWith(' E')) {
              const match = line.match(/([D\.])([E\.])([VAS\.])([S\.])([D\.])([T\.])\s+([^\s]+)\s+(.+)/);
              if (match) {
                codecs.push({
                  decoding: match[1] === 'D',
                  encoding: match[2] === 'E',
                  type: match[3],
                  draw: match[4] === 'S',
                  direct: match[5] === 'D',
                  trivial: match[6] === 'T',
                  name: match[7],
                  description: match[8]
                });
              }
            }
          }
          
          resolve(codecs);
        } else {
          reject(new Error('Failed to get supported codecs'));
        }
      });
    });
  }

  isFormatSupported(format) {
    const supportedVideoFormats = ['mp4', 'webm', 'mkv', 'avi', 'mov', 'flv', 'wmv'];
    const supportedAudioFormats = ['mp3', 'aac', 'ogg', 'wav', 'flac', 'm4a', 'opus'];
    
    return supportedVideoFormats.includes(format.toLowerCase()) || 
           supportedAudioFormats.includes(format.toLowerCase());
  }

  getCodecInfo(codec) {
    const codecInfo = {
      'h264': { name: 'H.264', type: 'video', quality: 'High', compatibility: 'Universal' },
      'h265': { name: 'H.265/HEVC', type: 'video', quality: 'Very High', compatibility: 'Modern' },
      'vp9': { name: 'VP9', type: 'video', quality: 'High', compatibility: 'Modern' },
      'av1': { name: 'AV1', type: 'video', quality: 'Very High', compatibility: 'Latest' },
      'mp3': { name: 'MP3', type: 'audio', quality: 'Good', compatibility: 'Universal' },
      'aac': { name: 'AAC', type: 'audio', quality: 'Good', compatibility: 'Universal' },
      'opus': { name: 'Opus', type: 'audio', quality: 'Excellent', compatibility: 'Modern' },
      'vorbis': { name: 'Vorbis', type: 'audio', quality: 'Good', compatibility: 'Good' },
      'flac': { name: 'FLAC', type: 'audio', quality: 'Lossless', compatibility: 'Good' }
    };
    
    return codecInfo[codec.toLowerCase()] || { 
      name: codec.toUpperCase(), 
      type: 'unknown', 
      quality: 'Unknown', 
      compatibility: 'Unknown' 
    };
  }
}

module.exports = FFmpegService;
