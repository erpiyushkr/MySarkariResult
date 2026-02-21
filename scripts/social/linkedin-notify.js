require('dotenv').config();
const fs = require('fs');
const formatMessage = require('./format-message');
const fetch = global.fetch || require('node-fetch');

const TEMP_FILE = '/tmp/new-posts.json';

const LINKEDIN_ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN;
const LINKEDIN_ORG_ID = process.env.LINKEDIN_ORG_ID;

async function sendLinkedIn(message) {
    if (!LINKEDIN_ACCESS_TOKEN || !LINKEDIN_ORG_ID) {
        console.log("[LinkedIn] Skipping: missing secrets");
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

            console.log(`[LinkedIn] Posting: ${post.url}`);
            await sendLinkedIn(message);

            // Wait a small amount to prevent rate limiting APIs
            await new Promise(r => setTimeout(r, 1000));
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(0);
    }
})();
