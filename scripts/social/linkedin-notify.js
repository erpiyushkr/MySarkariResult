try { require('dotenv').config(); } catch (e) { /* dotenv is optional in this runtime */ }
const fs = require('fs');
const formatMessage = require('./format-message');
const fetch = global.fetch;

const POSTS_FILE = '/tmp/new-posts.json';

const LINKEDIN_ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN;
const LINKEDIN_ORG_ID = process.env.LINKEDIN_ORG_ID;

// Platform-specific send function
async function sendNotification(message) {
    if (!LINKEDIN_ACCESS_TOKEN || !LINKEDIN_ORG_ID) {
        console.log('[LinkedIn] Skipping: missing secrets');
        return;
    }

    const payload = {
        author: `urn:li:organization:${LINKEDIN_ORG_ID}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
            'com.linkedin.ugc.ShareContent': {
                shareCommentary: {
                    text: message,
                },
                shareMediaCategory: 'NONE',
            },
        },
        visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
    };

    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
            'X-Restli-Protocol-Version': '2.0.0',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`[LinkedIn] Failed: ${response.status} ${response.statusText} - ${errBody}`);
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

            // 4. Platform-specific sending with try/catch
            try {
                console.log(`[LinkedIn] Posting: ${url}`);
                await sendNotification(message);
                console.log('[LinkedIn] Success');
            } catch (err) {
                console.error('[LinkedIn] Error:', err && err.message ? err.message : String(err));
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
