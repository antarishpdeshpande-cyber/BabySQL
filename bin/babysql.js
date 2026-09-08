#!/usr/bin/env node

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.join(__dirname, '..', 'dist');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.wasm': 'application/wasm',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const portArgIdx = process.argv.indexOf('--port');
let PORT = portArgIdx !== -1 ? parseInt(process.argv[portArgIdx + 1], 10) : 3000;
if (isNaN(PORT)) PORT = 3000;

const noOpen = process.argv.includes('--no-open');

function openBrowser(url) {
  const start = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${start} ${url}`, (err) => {
    if (err) {
      // ignore
    }
  });
}

function startServer(port) {
  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/' || reqPath === '') {
      reqPath = '/index.html';
    }

    const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.join(DIST_DIR, safePath);

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        // Fallback to index.html for SPA routing
        const indexPath = path.join(DIST_DIR, 'index.html');
        fs.readFile(indexPath, (readErr, content) => {
          if (readErr) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('BabySQL 404: Not Found');
            return;
          }
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(content);
        });
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      fs.readFile(filePath, (readErr, content) => {
        if (readErr) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('BabySQL Server Error');
          return;
        }
        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': ext === '.wasm' ? 'public, max-age=31536000, immutable' : 'no-cache',
        });
        res.end(content);
      });
    });
  });

  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      console.log(`Port ${port} is in use, trying ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', e);
    }
  });

  server.listen(port, '127.0.0.1', () => {
    const url = `http://127.0.0.1:${port}`;
    console.log(`
  \x1b[36m╭──────────────────────────────────────────────────╮\x1b[0m
  \x1b[36m│\x1b[0m  🍼  \x1b[1mBabySQL - Local SQLite & CSV Studio\x1b[0m          \x1b[36m│\x1b[0m
  \x1b[36m│\x1b[0m      Running locally at: \x1b[32m${url}\x1b[0m           \x1b[36m│\x1b[0m
  \x1b[36m│\x1b[0m      Zero cloud • 100% offline • Instant stats   \x1b[36m│\x1b[0m
  \x1b[36m╰──────────────────────────────────────────────────╯\x1b[0m
`);
    console.log(`  Press \x1b[33mCtrl + C\x1b[0m to stop.\n`);

    if (!noOpen) {
      openBrowser(url);
    }
  });
}

startServer(PORT);
