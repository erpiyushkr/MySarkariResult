#!/usr/bin/env node
/* scripts/automation-diagnostics.js
   Simple diagnostics for the automation pipeline. Prints presence of secrets and key files.
*/

const fs = require('fs');
const path = require('path');

function present(name) {
    return !!process.env[name];
}

function checkJsonFile(fp) {
    try {
        const txt = fs.readFileSync(fp, 'utf8');
        JSON.parse(txt);
        return { ok: true };
    } catch (e) {
        return { ok: false, error: e && e.message ? e.message : String(e) };
    }
}

console.log('=== Automation diagnostics ===');

const secrets = [
    'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHANNEL_ID',
    'TWITTER_API_KEY', 'TWITTER_API_SECRET', 'TWITTER_ACCESS_TOKEN', 'TWITTER_ACCESS_SECRET',
    'LINKEDIN_ACCESS_TOKEN', 'LINKEDIN_ORG_ID'
];

for (const s of secrets) {
    console.log(`${s}: ${present(s) ? 'present' : 'MISSING'}`);
}

const rss = path.resolve(process.cwd(), 'rss.xml');
console.log(`rss.xml: ${fs.existsSync(rss) ? 'exists' : 'MISSING'}`);
if (fs.existsSync(rss)) {
    const txt = fs.readFileSync(rss, 'utf8');
    console.log(`rss.xml length: ${txt.length}`);
}

const sitemap = path.resolve(process.cwd(), 'sitemap.xml');
console.log(`sitemap.xml: ${fs.existsSync(sitemap) ? 'exists' : 'MISSING'}`);

const dataDir = path.resolve(process.cwd(), 'assets', 'data');
if (fs.existsSync(dataDir)) {
    const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
    console.log(`assets/data: ${files.length} json files`);
    for (const f of files) {
        const res = checkJsonFile(path.join(dataDir, f));
        console.log(` - ${f}: ${res.ok ? 'OK' : 'INVALID (' + res.error + ')'}`);
    }
} else {
    console.log('assets/data: MISSING');
}

// Check social ledger
const ledgerPath = path.resolve(process.cwd(), 'assets', 'data', 'social-posts.json');
if (fs.existsSync(ledgerPath)) {
    const res = checkJsonFile(ledgerPath);
    if (res.ok) {
        try {
            const txt = fs.readFileSync(ledgerPath, 'utf8');
            const parsed = JSON.parse(txt);
            const count = Array.isArray(parsed.posted) ? parsed.posted.length : 0;
            console.log(`social-posts.json: OK (${count} entries)`);
        } catch (e) {
            console.log(`social-posts.json: OK but failed to count entries: ${e && e.message ? e.message : String(e)}`);
        }
    } else {
        console.log(`social-posts.json: INVALID (${res.error})`);
    }
} else {
    console.log('social-posts.json: MISSING');
}

const postsFile = '/tmp/new-posts.json';
console.log(`/tmp/new-posts.json: ${fs.existsSync(postsFile) ? 'exists' : 'MISSING'}`);
if (fs.existsSync(postsFile)) {
    const res = checkJsonFile(postsFile);
    console.log(`/tmp/new-posts.json parse: ${res.ok ? 'OK' : 'INVALID (' + res.error + ')'}`);
}

// check platform scripts present
const scripts = ['scripts/social/telegram-notify.js', 'scripts/social/twitter-notify.js', 'scripts/social/linkedin-notify.js'];
for (const s of scripts) {
    console.log(`${s}: ${fs.existsSync(path.resolve(s)) ? 'present' : 'MISSING'}`);
}

console.log('=== End diagnostics ===');
process.exit(0);
