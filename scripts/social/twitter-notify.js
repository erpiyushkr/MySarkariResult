require('dotenv').config();
const fs = require('fs');
const { TwitterApi } = require('twitter-api-v2');
const formatMessage = require('./format-message');

const TEMP_FILE = '/tmp/new-posts.json';

// OAuth 1.0a secrets
const apiKey = process.env.TWITTER_API_KEY;
const apiSecret = process.env.TWITTER_API_SECRET;
const accessToken = process.env.TWITTER_ACCESS_TOKEN;
const accessSecret = process.env.TWITTER_ACCESS_SECRET;

async function sendTweet(message) {
    if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
        console.warn("[Twitter] Skipping: TWITTER_API_KEY or other Twitter secrets missing");
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
        console.error("[Twitter] Failed:", JSON.stringify(e));
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
}

run().catch(console.error);
