#!/usr/bin/env node
/* scripts/notify-all.js
   Unified notifier: runs the per-platform notify scripts (telegram, twitter, linkedin)
   Each platform script reads /tmp/new-posts.json and is responsible for robust exit(0).
*/

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const POSTS_FILE = '/tmp/new-posts.json';
const ledger = require('./social/social-ledger');

function runScript(scriptPath, env = {}) {
    return new Promise((resolve) => {
        const abs = path.resolve(scriptPath);
        console.log(`[notify-all] Running ${abs}`);
        let out = '';
        let errOut = '';
        const child = execFile(process.execPath, [abs], { env: Object.assign({}, process.env, env), cwd: process.cwd() }, (err, stdout, stderr) => {
            if (stdout) out += stdout;
            if (stderr) errOut += stderr;
            if (out) process.stdout.write(out);
            if (errOut) process.stderr.write(errOut);

            const baseName = path.basename(scriptPath);
            const ok = out.includes('Success') || /\[.*\] Success/.test(out);
            const skippedAlready = out.includes('Skipping (already posted)') || /Skipping duplicate URL/.test(out);
            const skippedMissingSecrets = out.includes('Skipping: missing secrets');

            if (skippedAlready) {
                console.log(`[notify] ${baseName} skipped (already posted)`);
            } else if (skippedMissingSecrets) {
                console.log(`[notify] ${baseName} skipped (missing secrets)`);
            } else if (ok && !err) {
                console.log(`[notify] ${baseName} OK`);
            } else if (err) {
                console.log(`[notify] ${baseName} FAIL - exited with error: ${err && err.message ? err.message : String(err)}`);
            } else {
                console.log(`[notify] ${baseName} -- no explicit success string found; check logs`);
            }

            // Always resolve to avoid failing the whole pipeline -- scripts should handle errors themselves
            resolve();
        });
    });
}

(async () => {
    try {
        if (!fs.existsSync(POSTS_FILE)) {
            console.log('[notify-all] No new posts file, nothing to do.');
            process.exit(0);
        }

        let posts = [];
        try {
            posts = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8'));
        } catch (e) {
            console.error('[notify-all] Invalid JSON in /tmp/new-posts.json');
            process.exit(0);
        }

        if (!Array.isArray(posts) || posts.length === 0) {
            console.log('[notify-all] No new posts');
            process.exit(0);
        }

        // Run platform scripts in order. We pass MARK_LEDGER=false so per-platform scripts
        // will write successful URLs to /tmp/notify-results-<platform>.json instead of
        // marking the ledger directly. notify-all will aggregate results and mark ledger
        // only when all platforms succeeded for a given URL.
        const platformMap = [
            { script: './scripts/social/telegram-notify.js', name: 'telegram', results: '/tmp/notify-results-telegram.json' },
            { script: './scripts/social/twitter-notify.js', name: 'twitter', results: '/tmp/notify-results-twitter.json' },
            { script: './scripts/social/linkedin-notify.js', name: 'linkedin', results: '/tmp/notify-results-linkedin.json' }
        ];

        for (const p of platformMap) {
            await runScript(p.script, { MARK_LEDGER: 'false' });
        }

        // Aggregate results and mark ledger only when every platform succeeded for a URL
        if (Array.isArray(posts) && posts.length > 0) {
            // Load per-platform result sets
            const successSets = {};
            for (const p of platformMap) {
                try {
                    if (fs.existsSync(p.results)) {
                        const arr = JSON.parse(fs.readFileSync(p.results, 'utf8')) || [];
                        successSets[p.name] = new Set(arr);
                    } else {
                        successSets[p.name] = new Set();
                    }
                } catch (e) {
                    successSets[p.name] = new Set();
                }
            }

            for (const post of posts) {
                const url = post.url || post.link || post;
                if (!url) continue;
                // Check all platforms
                const allSucceeded = platformMap.every(p => successSets[p.name] && successSets[p.name].has(url));
                if (allSucceeded) {
                    // Mark ledger per-platform for clarity
                    for (const p of platformMap) {
                        try { ledger.markPosted(url, p.name); } catch (e) { /* ignore */ }
                    }
                    console.log('[notify-all] Marked ledger for', url);
                } else {
                    console.log('[notify-all] Not marking ledger for', url, '- not all platforms succeeded');
                }
            }

            // cleanup result files
            for (const p of platformMap) {
                try { if (fs.existsSync(p.results)) fs.unlinkSync(p.results); } catch (e) { /* ignore */ }
            }
        }

        console.log('[notify-all] Done');
        process.exit(0);
    } catch (e) {
        console.error('[notify-all] Fatal error:', e && e.message ? e.message : String(e));
        process.exit(0);
    }
})();
