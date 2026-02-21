require('dotenv').config();
const fs = require('fs');
const formatMessage = require('./format-message');

const TEMP_FILE = '/tmp/new-posts.json';

const LINKEDIN_ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN;
const LINKEDIN_ORG_ID = process.env.LINKEDIN_ORG_ID;

async function sendLinkedIn(message) {
    if (!LINKEDIN_ACCESS_TOKEN || !LINKEDIN_ORG_ID) {
        console.warn("[LinkedIn] Skipping: LINKEDIN_ACCESS_TOKEN or LINKEDIN_ORG_ID missing");
        return;
    }

    const payload = {
        author: `urn:li:organization:${LINKEDIN_ORG_ID}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
            'com.linkedin.ugc.ShareContent': {
                shareCommentary: {
                    text: message
                },
                shareMediaCategory: 'NONE'
            }
        },
        visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
    };

    try {
        const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
                'X-Restli-Protocol-Version': '2.0.0',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errBody = await response.text();
            console.error(`[LinkedIn] Failed: ${response.status} ${response.statusText}`, errBody);
        } else {
            console.log("[LinkedIn] Success");
        }
    } catch (e) {
        console.error("[LinkedIn] Failed:", e.message);
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

        console.log(`[LinkedIn] Posting: ${post.url}`);
        await sendLinkedIn(message);

        // Wait a small amount to prevent rate limiting APIs
        await new Promise(r => setTimeout(r, 1000));
    }
}

run().catch(console.error);
