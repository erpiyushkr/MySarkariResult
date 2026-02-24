try { require('dotenv').config(); } catch (e) { /* dotenv is optional in this runtime */ }
const fs = require('fs');
const formatMessage = require('./format-message');
const ledger = require('./social-ledger');
const fetch = global.fetch;

const POSTS_FILE = '/tmp/new-posts.json';

const LINKEDIN_ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN;
const LINKEDIN_ORG_ID = process.env.LINKEDIN_ORG_ID;
const MARK_LEDGER = (process.env.MARK_LEDGER || 'true') !== 'false';
const RESULTS_FILE = '/tmp/notify-results-linkedin.json';

console.log('[ENV CHECK][LinkedIn]', {
    LINKEDIN_ACCESS_TOKEN: !!LINKEDIN_ACCESS_TOKEN,
    LINKEDIN_ORG_ID: !!LINKEDIN_ORG_ID,
    MARK_LEDGER: MARK_LEDGER
});

// Platform-specific send function
async function sendNotification(message) {
    if (!LINKEDIN_ACCESS_TOKEN || !LINKEDIN_ORG_ID) {
        console.log('[LinkedIn] Skipping: missing secrets');
        return false;
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

    try {
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
            console.error(`[LinkedIn] Failed: ${response.status} ${response.statusText} - ${errBody}`);
            return false;
        }
        return true;
    } catch (e) {
        console.error('[LinkedIn] Error sending:', e && e.message ? e.message : String(e));
        return false;
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

            // Skip if already posted
            try {
                if (ledger.isPosted(url, 'linkedin')) {
                    console.log('[LinkedIn] Skipping (already posted)');
                    continue;
                }
            } catch (e) {
                // ignore ledger errors
            }

            // 4. Platform-specific sending with try/catch
            try {
                console.log(`[LinkedIn] Posting: ${url}`);
                const ok = await sendNotification(message);
                if (ok) {
                    console.log('[LinkedIn] Success');
                    try {
                        if (MARK_LEDGER) {
                            ledger.markPosted(url, 'linkedin');
                        } else {
                            try {
                                let arr = [];
                                if (fs.existsSync(RESULTS_FILE)) {
                                    arr = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8')) || [];
                                }
                                if (!arr.includes(url)) {
                                    arr.push(url);
                                    fs.writeFileSync(RESULTS_FILE, JSON.stringify(arr, null, 2), 'utf8');
                                }
                            } catch (e) {
                                // ignore
                            }
                        }
                    } catch (e) { /* ignore */ }
                } else {
                    console.log('[LinkedIn] Skipped or failed, not marking ledger');
                }
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
