require('dotenv').config();
const fs = require('fs');
const { TwitterApi } = require('twitter-api-v2');
const formatMessage = require('./format-message');
const fetch = global.fetch || require('node-fetch');

const TEMP_FILE = '/tmp/new-posts.json';

const apiKey = process.env.TWITTER_API_KEY;
const apiSecret = process.env.TWITTER_API_SECRET;
const accessToken = process.env.TWITTER_ACCESS_TOKEN;
const accessSecret = process.env.TWITTER_ACCESS_SECRET;

async function sendTweet(message) {
    if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
        console.log("[Twitter] Skipping: missing secrets");
        return;
    }

    const client = new TwitterApi({
        appKey: apiKey,
        appSecret: apiSecret,
        accessToken: accessToken,
        accessSecret: accessSecret,
    });

    try {
        const { data: createdTweet } = await client.v2.tweet(message);
        console.log("[Twitter] Success");
    } catch (e) {
        const errMessage = typeof e === "object" ? JSON.stringify(e) : String(e);
        console.error("[Twitter] Failed:", errMessage);
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
            let message;
            // Strict Twitter Truncation Algorithm
            const fixedPart = formatMessage('', post.url);
            const maxTotal = 280;
            const reserved = fixedPart.length;
            const maxTitle = maxTotal - reserved;

            if (post.title.length <= maxTitle) {
                message = formatMessage(post.title, post.url);
            } else {
                const truncatedTitle = post.title.slice(0, maxTitle - 1) + '…';
                message = formatMessage(truncatedTitle, post.url);
            }

            console.log(`[Twitter] Posting: ${post.url}`);
            await sendTweet(message);

            // Wait a small amount to prevent rate limiting APIs
            await new Promise(r => setTimeout(r, 1000));
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(0);
    }
})();
