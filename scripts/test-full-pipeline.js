#!/usr/bin/env node
/* scripts/test-full-pipeline.js
   Local test harness to simulate a new post, run update-rss and notify-all.
   Safe to run locally: platform scripts skip posting if secrets missing.
*/

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_ROOT = path.resolve(process.cwd());
const POSTS_FILE = path.join(REPO_ROOT, 'scripts', 'tmp', 'new-posts.json');

try { fs.mkdirSync(path.dirname(POSTS_FILE), { recursive: true }); } catch (e) { }

// Create a small test post in Jobs/ to simulate a new post
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const testPath = `Jobs/test-social-${ts}.html`;
const testUrl = `https://mysarkariresult.in/${testPath}`;

if (!fs.existsSync('Jobs')) fs.mkdirSync('Jobs');
console.log('[test-full-pipeline] Writing test HTML at', testPath);
fs.writeFileSync(testPath, `<!doctype html><html><head><title>Test ${ts}</title></head><body><h1>Test ${ts}</h1></body></html>`, 'utf8');

try {
    console.log('[test-full-pipeline] Running detect-new-post.js');
    execSync('node scripts/social/detect-new-post.js', { stdio: 'inherit' });
} catch (e) {
    console.error('[test-full-pipeline] detect-new-post failed (but continuing):', e && e.message ? e.message : String(e));
}

try {
    console.log('[test-full-pipeline] Running update-json-index.js');
    execSync('node scripts/update-json-index.js', { stdio: 'inherit' });
} catch (e) {
    console.error('[test-full-pipeline] update-json-index failed (but continuing):', e && e.message ? e.message : String(e));
}

try {
    console.log('[test-full-pipeline] Running add-meta-tags.js');
    execSync('node scripts/add-meta-tags.js', { stdio: 'inherit' });
} catch (e) {
    console.error('[test-full-pipeline] add-meta-tags failed (but continuing):', e && e.message ? e.message : String(e));
}

try {
    console.log('[test-full-pipeline] Running generate-sitemaps.js');
    execSync('node scripts/generate-sitemaps.js', { stdio: 'inherit' });
} catch (e) {
    console.error('[test-full-pipeline] generate-sitemaps failed (but continuing):', e && e.message ? e.message : String(e));
}

try {
    console.log('[test-full-pipeline] Running update-rss.js');
    execSync('node scripts/update-rss.js', { stdio: 'inherit' });
} catch (e) {
    console.error('[test-full-pipeline] update-rss failed (but continuing):', e && e.message ? e.message : String(e));
}

try {
    console.log('[test-full-pipeline] Running notify-all.js (first run)');
    execSync('node scripts/notify-all.js', { stdio: 'inherit' });
} catch (e) {
    console.error('[test-full-pipeline] notify-all failed (but continuing):', e && e.message ? e.message : String(e));
}

// Inspect ledger after first run
try {
    const ledger = require('./social/social-ledger');
    const ledgerData = ledger.loadLedger();
    const count = Array.isArray(ledgerData.posted) ? ledgerData.posted.length : 0;
    console.log(`[test-full-pipeline] Ledger entries after first run: ${count}`);
} catch (e) {
    console.error('[test-full-pipeline] Failed to read ledger:', e && e.message ? e.message : String(e));
}

// Run notifier again to verify skip behavior
try {
    console.log('[test-full-pipeline] Running notify-all.js (second run) — should skip already-posted items');
    execSync('node scripts/notify-all.js', { stdio: 'inherit' });
} catch (e) {
    console.error('[test-full-pipeline] notify-all (second run) failed (but continuing):', e && e.message ? e.message : String(e));
}

console.log('[test-full-pipeline] Done. Inspect rss.xml, assets/data/social-posts.json and logs for results.');
process.exit(0);
