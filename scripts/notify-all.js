#!/usr/bin/env node
/* scripts/notify-all.js
   Unified notifier: runs the per-platform notify scripts (telegram, twitter, linkedin)
   Each platform script reads /tmp/new-posts.json and is responsible for robust exit(0).
*/

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const POSTS_FILE = '/tmp/new-posts.json';

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

        // Run platform scripts in order
        const scripts = [
            './scripts/social/telegram-notify.js',
            './scripts/social/twitter-notify.js',
            './scripts/social/linkedin-notify.js'
        ];

        for (const s of scripts) {
            await runScript(s);
        }

        console.log('[notify-all] Done');
        process.exit(0);
    } catch (e) {
        console.error('[notify-all] Fatal error:', e && e.message ? e.message : String(e));
        process.exit(0);
    }
})();
