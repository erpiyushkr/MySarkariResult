try { require('dotenv').config(); } catch (e) { /* dotenv is optional in this runtime */ }
const fs = require('fs');
const path = require('path');
const fetch = global.fetch;
const formatMessage = require('./format-message');
const ledger = require('./social-ledger');

const REPO_ROOT = path.resolve(__dirname, '../../');
const POSTS_FILE = path.join(REPO_ROOT, 'scripts', 'tmp', 'new-posts.json');
try { fs.mkdirSync(path.dirname(POSTS_FILE), { recursive: true }); } catch (e) { }
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;
const MARK_LEDGER = (process.env.MARK_LEDGER || 'true') !== 'false';
const RESULTS_FILE = path.join(REPO_ROOT, 'scripts', 'tmp', 'notify-results-telegram.json');

// Log env presence for debugging (CI visibility)
console.log('[ENV CHECK][Telegram]', {
    TELEGRAM_BOT_TOKEN: !!TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHANNEL_ID: !!TELEGRAM_CHANNEL_ID,
    MARK_LEDGER: MARK_LEDGER
});

// Platform-specific send function
async function sendNotification(message) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHANNEL_ID) {
        console.log('[Telegram] Skipping: missing secrets');
        return false;
    }

    const payload = {
        chat_id: TELEGRAM_CHANNEL_ID,
        text: message,
        disable_web_page_preview: false,
    };

    try {
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errBody = await response.text();
            console.error(`[Telegram] Failed: ${response.status} ${response.statusText} - ${errBody}`);
            return false;
        }
        return true;
    } catch (e) {
        console.error('[Telegram] Error sending:', e && e.message ? e.message : String(e));
        return false;
    }
}

(async () => {
    try {
        // 1. Check if posts file exists
        if (!fs.existsSync(POSTS_FILE)) {
            console.log('No new posts file');
            process.exit(0);
        }

        // 2. Read and parse posts safely
        let posts = [];
        try {
            posts = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8'));
        } catch (e) {
            console.log('Invalid JSON');
            process.exit(0);
        }

        if (!Array.isArray(posts) || posts.length === 0) {
            console.log('No new posts');
            process.exit(0);
        }

        // 3. For each post, send notification
        for (const post of posts) {
            const { title, url } = post;
            const message = formatMessage(title, url);

            // Skip if already posted (cross-run ledger)
            try {
                if (ledger.isPosted(url, 'telegram')) {
                    console.log('[Telegram] Skipping (already posted)');
                    continue;
                }
            } catch (e) {
                // ignore ledger errors — continue to attempt post
            }

            // 4. Platform-specific sending with try/catch
            try {
                console.log(`[Telegram] Posting: ${url}`);
                const ok = await sendNotification(message);
                if (ok) {
                    console.log('[Telegram] Success');
                    try {
                        if (MARK_LEDGER) {
                            ledger.markPosted(url, 'telegram');
                        } else {
                            // Record successful URL to a per-platform results file so notify-all can decide
                            try {
                                let arr = [];
                                if (fs.existsSync(RESULTS_FILE)) {
                                    arr = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8')) || [];
                                }
                                if (!arr.includes(url)) {
                                    arr.push(url);
                                    fs.writeFileSync(RESULTS_FILE, JSON.stringify(arr, null, 2), 'utf8');
                                }
                            } catch (e) {
                                // ignore
                            }
                        }
                    } catch (e) { /* ignore */ }
                } else {
                    console.log('[Telegram] Skipped or failed, not marking ledger');
                }
            } catch (err) {
                console.error('[Telegram] Error:', err && err.message ? err.message : String(err));
            }

            // Wait a small amount to prevent rate limiting
            await new Promise((r) => setTimeout(r, 1000));
        }

        process.exit(0);
    } catch (e) {
        console.error(e && e.message ? e.message : String(e));
        process.exit(0);
    }
})();
