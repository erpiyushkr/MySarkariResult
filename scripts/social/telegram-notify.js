try { require('dotenv').config(); } catch (e) { /* dotenv is optional in this runtime */ }
const fs = require('fs');
const fetch = global.fetch;
const formatMessage = require('./format-message');
const ledger = require('./social-ledger');

const POSTS_FILE = '/tmp/new-posts.json';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;

// Platform-specific send function
async function sendNotification(message) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHANNEL_ID) {
        console.log('[Telegram] Skipping: missing secrets');
        return;
    }

    const payload = {
        chat_id: TELEGRAM_CHANNEL_ID,
        text: message,
        disable_web_page_preview: false,
    };

    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`[Telegram] Failed: ${response.status} ${response.statusText} - ${errBody}`);
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
                await sendNotification(message);
                console.log('[Telegram] Success');
                try { ledger.markPosted(url, 'telegram'); } catch (e) { /* ignore */ }
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
