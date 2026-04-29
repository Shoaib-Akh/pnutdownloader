const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Route to get cookies via iframe
router.get('/extract', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Cookie Extractor</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; }
            .iframe-container { 
                border: 2px solid #ccc; 
                height: 500px; 
                margin: 20px 0; 
                overflow: hidden;
            }
            iframe { 
                width: 100%; 
                height: 100%; 
                border: none; 
                transform: scale(0.8);
                transform-origin: 0 0;
                width: 125%;
                height: 125%;
            }
            .status { 
                padding: 10px; 
                margin: 10px 0; 
                border-radius: 5px;
                background: #f0f0f0;
            }
            .success { background: #d4edda; color: #155724; }
            .error { background: #f8d7da; color: #721c24; }
            button { 
                padding: 10px 20px; 
                background: #007bff; 
                color: white; 
                border: none; 
                border-radius: 5px; 
                cursor: pointer;
                margin: 5px;
            }
            button:hover { background: #0056b3; }
        </style>
    </head>
    <body>
        <div class="container">
            <h2>YouTube Cookie Extractor</h2>
            <p>Extract real YouTube cookies to enable high-quality downloads</p>
            
            <div class="status" id="status">
                Click "Load YouTube" to start cookie extraction
            </div>
            
            <button onclick="loadYouTube()">Load YouTube</button>
            <button onclick="extractCookies()">Extract Cookies</button>
            <button onclick="testCookies()">Test Cookies</button>
            
            <div class="iframe-container">
                <iframe id="youtubeFrame" src="about:blank"></iframe>
            </div>
            
            <div id="results"></div>
        </div>

        <script>
            let cookiesExtracted = false;
            
            function updateStatus(message, type = '') {
                const status = document.getElementById('status');
                status.textContent = message;
                status.className = 'status ' + type;
            }
            
            function loadYouTube() {
                const iframe = document.getElementById('youtubeFrame');
                iframe.src = 'https://www.youtube.com';
                updateStatus('Loading YouTube... Please wait', '');
                
                iframe.onload = function() {
                    updateStatus('YouTube loaded! Now click "Extract Cookies"', 'success');
                };
                
                iframe.onerror = function() {
                    updateStatus('Failed to load YouTube. Check your internet connection.', 'error');
                };
            }
            
            async function extractCookies() {
                try {
                    updateStatus('Extracting cookies...', '');
                    
                    // Try to get cookies from the iframe
                    const iframe = document.getElementById('youtubeFrame');
                    const iframeWindow = iframe.contentWindow;
                    
                    // Get all cookies for youtube.com
                    const cookies = await iframeWindow.document.cookie;
                    
                    if (!cookies) {
                        // Try alternative method
                        const allCookies = await navigator.cookieStore.getAll({
                            domain: 'youtube.com'
                        });
                        
                        if (allCookies.length > 0) {
                            sendCookiesToServer(allCookies);
                            return;
                        }
                    }
                    
                    if (cookies) {
                        // Parse cookies into individual entries
                        const cookieArray = cookies.split(';').map(cookie => {
                            const [name, value] = cookie.trim().split('=');
                            return { name, value, domain: '.youtube.com' };
                        });
                        
                        sendCookiesToServer(cookieArray);
                    } else {
                        updateStatus('No cookies found. Please watch a video on YouTube first.', 'error');
                    }
                } catch (error) {
                    updateStatus('Error extracting cookies: ' + error.message, 'error');
                    console.error('Cookie extraction error:', error);
                }
            }
            
            function sendCookiesToServer(cookies) {
                fetch('/cookies/save', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ cookies })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        cookiesExtracted = true;
                        updateStatus('Cookies extracted successfully! High-quality downloads should now work.', 'success');
                    } else {
                        updateStatus('Failed to save cookies: ' + data.error, 'error');
                    }
                })
                .catch(error => {
                    updateStatus('Error saving cookies: ' + error.message, 'error');
                });
            }
            
            function testCookies() {
                fetch('/cookies/test')
                .then(response => response.json())
                .then(data => {
                    if (data.valid) {
                        updateStatus('Cookies are valid and ready for downloads!', 'success');
                    } else {
                        updateStatus('Cookies not found or invalid. Please extract cookies first.', 'error');
                    }
                })
                .catch(error => {
                    updateStatus('Error testing cookies: ' + error.message, 'error');
                });
            }
        </script>
    </body>
    </html>
  `);
});

// Route to save cookies
router.post('/save', (req, res) => {
  try {
    const { cookies } = req.body;
    
    if (!cookies || cookies.length === 0) {
      return res.json({ success: false, error: 'No cookies provided' });
    }
    
    // Create cookies directory if it doesn't exist
    const cookiesDir = path.join(__dirname, '../cookies');
    if (!fs.existsSync(cookiesDir)) {
      fs.mkdirSync(cookiesDir, { recursive: true });
    }
    
    // Convert cookies to Netscape format
    const netscapeFormat = cookies.map(cookie => {
      const domain = cookie.domain || '.youtube.com';
      const httpOnly = cookie.httpOnly ? 'TRUE' : 'FALSE';
      const path = cookie.path || '/';
      const secure = cookie.secure ? 'TRUE' : 'FALSE';
      const expires = cookie.expirationDate || 0;
      return `${domain}\t${httpOnly}\t${path}\t${secure}\t${expires}\t${cookie.name}\t${cookie.value}`;
    }).join('\n');
    
    // Write cookies file
    const header = '# Netscape HTTP Cookie File\n# Generated by PNUT Downloader\n\n';
    const content = header + netscapeFormat + '\n';
    
    fs.writeFileSync(path.join(cookiesDir, 'cookies.txt'), content);
    
    console.log(`✅ Saved ${cookies.length} cookies to cookies.txt`);
    res.json({ success: true, count: cookies.length });
    
  } catch (error) {
    console.error('Error saving cookies:', error);
    res.json({ success: false, error: error.message });
  }
});

// Route to test cookies
router.get('/test', (req, res) => {
  try {
    const cookiesPath = path.join(__dirname, '../cookies/cookies.txt');
    
    if (!fs.existsSync(cookiesPath)) {
      return res.json({ valid: false, error: 'Cookies file not found' });
    }
    
    const content = fs.readFileSync(cookiesPath, 'utf-8');
    const isValid = content.includes('# Netscape') && content.length > 50;
    
    res.json({ valid: isValid });
    
  } catch (error) {
    res.json({ valid: false, error: error.message });
  }
});

module.exports = router;
