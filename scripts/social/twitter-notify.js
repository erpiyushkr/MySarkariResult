try { require('dotenv').config(); } catch (e) { /* dotenv is optional in this runtime */ }
const fs = require('fs');
const fetch = global.fetch;
const formatMessage = require('./format-message');
// lazy-require twitter library so missing dev deps don't crash local runs
let TwitterApi;

const POSTS_FILE = '/tmp/new-posts.json';

const apiKey = process.env.TWITTER_API_KEY;
const apiSecret = process.env.TWITTER_API_SECRET;
const accessToken = process.env.TWITTER_ACCESS_TOKEN;
const accessSecret = process.env.TWITTER_ACCESS_SECRET;

// Platform-specific send function
async function sendNotification(message) {
    if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
        console.log('[Twitter] Skipping: missing secrets');
        return;
    }

    try {
        TwitterApi = TwitterApi || require('twitter-api-v2').TwitterApi;
    } catch (e) {
        console.log('[Twitter] twitter-api-v2 not installed, skipping');
        return;
    }

    const client = new TwitterApi({
        appKey: apiKey,
        appSecret: apiSecret,
        accessToken: accessToken,
        accessSecret: accessSecret,
    });

    try {
        await client.v2.tweet(message);
    } catch (e) {
        throw new Error(typeof e === 'object' ? JSON.stringify(e) : String(e));
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
            let message;

            // Strict Twitter Truncation Algorithm
            const fixedPart = formatMessage('', url);
            const maxTotal = 280;
            const reserved = fixedPart.length;
            const maxTitle = maxTotal - reserved;

            if ((title || '').length <= maxTitle) {
                message = formatMessage(title || '', url);
            } else {
                const truncatedTitle = (title || '').slice(0, maxTitle - 1) + '…';
                message = formatMessage(truncatedTitle, url);
            }

            // 4. Platform-specific sending with try/catch
            try {
                console.log(`[Twitter] Posting: ${url}`);
                await sendNotification(message);
                console.log('[Twitter] Success');
            } catch (err) {
                console.error('[Twitter] Failed:', err && err.message ? err.message : String(err));
            }

            // Wait a small amount to prevent rate limiting APIs
            await new Promise((r) => setTimeout(r, 1000));
        }

        process.exit(0);
    } catch (e) {
        console.error(e && e.message ? e.message : String(e));
        process.exit(0);
    }
})();
