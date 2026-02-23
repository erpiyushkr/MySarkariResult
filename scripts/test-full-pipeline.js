#!/usr/bin/env node
/* scripts/test-full-pipeline.js
   Local test harness to simulate a new post, run update-rss and notify-all.
   Safe to run locally: platform scripts skip posting if secrets missing.
*/

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const POSTS_FILE = '/tmp/new-posts.json';

const sample = [
    {
        section: 'Jobs',
        title: 'Automation System Test',
        url: 'https://mysarkariresult.in/Jobs/automation-system-test.html',
        date: new Date().toISOString()
    }
];

console.log('[test-full-pipeline] Writing mock new-posts to', POSTS_FILE);
fs.writeFileSync(POSTS_FILE, JSON.stringify(sample, null, 2), 'utf8');

const ledger = require('./social/social-ledger');

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
