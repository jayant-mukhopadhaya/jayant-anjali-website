// Renders each draft card to a 2000 x 1404 JPG beside its HTML.
//   NODE_PATH=/opt/node-tools/node_modules node design/schedule-card/render.js [v1 v2 v3]
//
// The cards are served over http rather than file:// so the motif
// masks (CSS mask-image) are allowed to load.
const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '../..');
const TYPES = {
  '.html': 'text/html', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

server.listen(0, async () => {
  const port = server.address().port;
  const names = process.argv.slice(2).length ? process.argv.slice(2) : ['v1', 'v2', 'v3'];
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 2000, height: 1404 } });
  for (const name of names) {
    await page.goto('http://localhost:' + port + '/design/schedule-card/' + name + '.html', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.locator('.card').screenshot({
      path: path.join(__dirname, 'schedule_' + name + '.jpg'),
      type: 'jpeg',
      quality: 90
    });
    console.log('rendered', name);
  }
  await browser.close();
  server.close();
});
