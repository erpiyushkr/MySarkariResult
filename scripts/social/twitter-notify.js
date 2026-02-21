require('dotenv').config();
const fs = require('fs');
const { TwitterApi } = require('twitter-api-v2');

const TEMP_FILE = '/tmp/new-posts.json';

// OAuth 1.0a secrets
const apiKey = process.env.TWITTER_API_KEY;
const apiSecret = process.env.TWITTER_API_SECRET;
const accessToken = process.env.TWITTER_ACCESS_TOKEN;
const accessSecret = process.env.TWITTER_ACCESS_SECRET;

async function sendTweet(message) {
    if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
        console.warn("Twitter secrets are missing. Skipping Twitter notification.");
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
        console.log("Successfully sent Twitter notification:", createdTweet.id);
    } catch (e) {
        console.error("Failed to make Twitter API call:", JSON.stringify(e));
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

        console.log("Sending to Twitter:", post.title);
        await sendTweet(message);

        // Wait a small amount to prevent rate limiting APIs
        await new Promise(r => setTimeout(r, 1000));
    }
}

run().catch(console.error);
