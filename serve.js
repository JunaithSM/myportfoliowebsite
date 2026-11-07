/**
 * ==============================================================================
 * Cross-Platform Local Preview Server (Zero-Dependency Node.js Server)
 * Works identically on macOS, Linux, and Windows.
 * ==============================================================================
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const ROOT_DIR = __dirname;
const DIST_DIR = path.join(ROOT_DIR, 'dist');

const MIME_MAP = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/') reqPath = '/index.html';

  let filePath = path.join(DIST_DIR, reqPath);

  // If directory, look for index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  // If file doesn't exist, check clean URLs without extension
  if (!fs.existsSync(filePath) && !path.extname(filePath)) {
    if (fs.existsSync(filePath + '.html')) {
      filePath = filePath + '.html';
    } else if (fs.existsSync(path.join(filePath, 'index.html'))) {
      filePath = path.join(filePath, 'index.html');
    }
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    const notFoundPage = path.join(DIST_DIR, '404.html');
    if (fs.existsSync(notFoundPage)) {
      res.end(fs.readFileSync(notFoundPage));
    } else {
      res.end('<h1>404 Not Found</h1>');
    }
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_MAP[ext] || 'application/octet-stream';

  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': 'no-cache'
  });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\x1b[36m==========================================\x1b[0m`);
  console.log(`\x1b[32m [Server] Running at: http://localhost:${PORT}/\x1b[0m`);
  console.log(`\x1b[90m Serving production static files from dist/\x1b[0m`);
  console.log(`\x1b[90m Press Ctrl+C to stop.\x1b[0m`);
  console.log(`\x1b[36m==========================================\x1b[0m`);
});

