require('dotenv').config();
const fs = require('fs');
const formatMessage = require('./format-message');
const fetch = global.fetch || require('node-fetch');

const TEMP_FILE = '/tmp/new-posts.json';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;

async function sendTelegram(message) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHANNEL_ID) {
        console.log("[Telegram] Skipping: missing secrets");
        return;
    }

    const payload = {
        chat_id: TELEGRAM_CHANNEL_ID,
        text: message,
        disable_web_page_preview: false
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
            console.error(`[Telegram] Failed: ${response.status} ${response.statusText}`, errBody);
        } else {
            console.log("[Telegram] Success");
        }
    } catch (e) {
        console.error("[Telegram] Failed:", e.message);
    }
}

(async () => {
    try {
        if (!fs.existsSync(TEMP_FILE)) {
            console.log('No new posts file');
            process.exit(0);
        }

        let posts = [];
        try {
            posts = JSON.parse(fs.readFileSync(TEMP_FILE, 'utf8'));
        } catch (e) {
            console.error('Invalid JSON');
            process.exit(0);
        }

        if (!posts.length) {
            console.log('No new posts');
            process.exit(0);
        }

        for (const post of posts) {
            const message = formatMessage(post.title, post.url);

            console.log(`[Telegram] Posting: ${post.url}`);
            await sendTelegram(message);

            // Wait a small amount to prevent rate limiting
            await new Promise(r => setTimeout(r, 1000));
        }
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(0);
    }
})();
