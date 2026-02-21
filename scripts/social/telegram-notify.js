require('dotenv').config();
const fs = require('fs');

const TEMP_FILE = '/tmp/new-posts.json';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;

async function sendTelegram(message) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHANNEL_ID) {
        console.warn("Telegram secrets are missing. Skipping Telegram notification.");
        return;
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
            console.error(`Telegram API err: ${response.status} ${response.statusText}`, errBody);
        } else {
            console.log("Successfully sent Telegram notification.");
        }
    } catch (e) {
        console.error("Failed to make Telegram API call:", e.message);
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

    for (const post of posts) {
        const message = `📢 New Update — MySarkariResult\n\n${post.title}\n\nView Details:\n${post.url}\n\n#MySarkariResult #GovtJobs`;

        console.log("Sending to Telegram:", post.title);
        await sendTelegram(message);

        // Wait a small amount to prevent rate limiting
        await new Promise(r => setTimeout(r, 1000));
    }
}

run().catch(console.error);
