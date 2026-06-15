/**
 * Scrapes the main Google Maps place photo for each HSRL site and saves it
 * to frontend/public/sites/site-{id}.jpg
 *
 * Run once: node scripts/fetch-site-photos.js
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, '../../frontend/public/sites');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const SITES = [
  { id: 1,  query: 'HSRL Anson Service Station Birmingham' },
  { id: 2,  query: 'HSRL Belgrave Service Station Leicester' },
  { id: 3,  query: 'HSRL Greenford Park Service Station London' },
  { id: 4,  query: 'HSRL Baddesley Service Station Atherstone' },
  { id: 5,  query: 'HSRL Swanley Service Station Kent' },
  { id: 6,  query: 'HSRL Astwick Service Station' },
  { id: 7,  query: 'HSRL Vineyard Service Station London' },
  { id: 8,  query: 'HSRL Wexham Service Station Slough' },
  { id: 9,  query: 'HSRL Lye Service Station West Midlands' },
  { id: 10, query: 'HSRL Girton Service Station Cambridge' },
  { id: 11, query: 'HSRL Patcham Service Station Brighton' },
  { id: 13, query: 'HSRL ESSO Park Royal Service Station London' },
  { id: 14, query: 'HSRL Gravesend Service Station Kent' },
  { id: 15, query: 'HSRL Amersham Service Station' },
  { id: 16, query: 'HSRL Oakham Service Station' },
  { id: 17, query: 'HSRL Spalding Service Station' },
  { id: 18, query: 'HSRL Erith Service Station' },
];

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destPath);
    proto.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(destPath);
        return downloadFile(res.headers.location, destPath).then(resolve).catch(reject);
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

async function fetchPhotoForSite(browser, site) {
  const destPath = path.join(OUT_DIR, `site-${site.id}.jpg`);

  // Skip if already downloaded
  if (fs.existsSync(destPath)) {
    console.log(`  ✓ site-${site.id}.jpg already exists, skipping`);
    return true;
  }

  // Fresh page per site to avoid detached frame issues
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  try {
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(site.query)}`;
    console.log(`  → Searching: ${site.query}`);

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // Dismiss cookie/consent buttons if present
    for (const sel of ['button[aria-label*="Accept"]', 'button[aria-label*="Reject"]', '#L2AGLb', 'button.tHlp8d']) {
      try {
        const btn = await page.$(sel);
        if (btn) { await btn.click(); await new Promise(r => setTimeout(r, 1000)); break; }
      } catch (_) {}
    }

    // Click the first place result link
    await new Promise(r => setTimeout(r, 2000));
    try {
      const firstResult = await page.$('a[href*="/maps/place/"]');
      if (firstResult) {
        await firstResult.click();
        await new Promise(r => setTimeout(r, 3500));
      }
    } catch (_) {}

    // Extract the best googleusercontent image URL
    const imgUrl = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      const gcImgs = imgs.filter(img =>
        img.src && (img.src.includes('googleusercontent.com') || img.src.includes('ggpht.com'))
      );
      // Sort by rendered area — largest is usually the place hero photo
      gcImgs.sort((a, b) => {
        const aArea = (a.naturalWidth || a.width) * (a.naturalHeight || a.height);
        const bArea = (b.naturalWidth || b.width) * (b.naturalHeight || b.height);
        return bArea - aArea;
      });
      return gcImgs.length > 0 ? gcImgs[0].src : null;
    });

    if (!imgUrl) {
      console.log(`  ✗ No photo found for site ${site.id}`);
      await page.close();
      return false;
    }

    // Request a larger version
    const cleanUrl = imgUrl.replace(/=w\d+.*$/, '') + '=w800-h500-k-no';
    console.log(`  ↓ Downloading photo...`);
    await downloadFile(cleanUrl, destPath);
    console.log(`  ✓ Saved site-${site.id}.jpg`);
    await page.close();
    return true;
  } catch (err) {
    console.log(`  ✗ Error: ${err.message}`);
    try { await page.close(); } catch (_) {}
    return false;
  }
}

async function main() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    userDataDir: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=en-GB', '--incognito'],
  });

  let success = 0;
  let fail = 0;

  for (const site of SITES) {
    console.log(`\n[${site.id}] ${site.query}`);
    const ok = await fetchPhotoForSite(browser, site);
    if (ok) success++; else fail++;
    // Polite delay between requests
    await new Promise(r => setTimeout(r, 1500));
  }

  await browser.close();
  console.log(`\nDone. ${success} photos saved, ${fail} failed.`);
  console.log(`Photos saved to: ${OUT_DIR}`);
}

main().catch(err => { console.error(err); process.exit(1); });
