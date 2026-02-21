require('dotenv').config();
const fs = require('fs');
const formatMessage = require('./format-message');

const TEMP_FILE = '/tmp/new-posts.json';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;

async function sendTelegram(message) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHANNEL_ID) {
        console.warn("[Telegram] Skipping: TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID missing");
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

async function run() {
    if (!fs.existsSync(TEMP_FILE)) {
        console.log("No new posts discovered (temp file missing). Exiting.");
        return;
    }

    let posts = [];
    try {
        const data = fs.readFileSync(TEMP_FILE, 'utf8');
        posts = JSON.parse(data);
    } catch (e) {
        console.error("Failed to parse newly detected posts JSON:", e.message);
        return;
    }

    if (posts.length === 0) {
        console.log("No new posts. Exiting.");
        return;
    }

    for (const post of posts) {
        const message = formatMessage(post.title, post.url);

        console.log(`[Telegram] Posting: ${post.url}`);
        await sendTelegram(message);

        // Wait a small amount to prevent rate limiting
        await new Promise(r => setTimeout(r, 1000));
    }
}

run().catch(console.error);
