try { require('dotenv').config(); } catch (e) { /* dotenv optional */ }
const fs = require('fs');
const crypto = require('crypto');
const fetch = global.fetch;
const formatMessage = require('./format-message');
const ledger = require('./social-ledger');

const POSTS_FILE = '/tmp/new-posts.json';

const apiKey = process.env.TWITTER_API_KEY;
const apiSecret = process.env.TWITTER_API_SECRET;
const accessToken = process.env.TWITTER_ACCESS_TOKEN;
const accessSecret = process.env.TWITTER_ACCESS_SECRET;
const MARK_LEDGER = (process.env.MARK_LEDGER || 'true') !== 'false';
const RESULTS_FILE = '/tmp/notify-results-twitter.json';

console.log('[ENV CHECK][Twitter]', {
    TWITTER_API_KEY: !!apiKey,
    TWITTER_ACCESS_TOKEN: !!accessToken,
    MARK_LEDGER: MARK_LEDGER
});

function percentEncode(str) {
    return encodeURIComponent(str)
        .replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

function generateNonce(length = 32) {
    return crypto.randomBytes(length).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, length);
}

function hmacSha1Base64(key, baseString) {
    return crypto.createHmac('sha1', key).update(baseString).digest('base64');
}

async function postStatus(status) {
    if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
        console.log('[Twitter] Skipping: missing secrets');
        return { ok: false, skipped: true };
    }

    const url = 'https://api.twitter.com/1.1/statuses/update.json';

    const oauth = {
        oauth_consumer_key: apiKey,
        oauth_nonce: generateNonce(16),
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
        oauth_token: accessToken,
        oauth_version: '1.0'
    };

    // Parameters include OAuth params and the POST body param 'status'
    const params = Object.assign({}, oauth, { status });

    // Create parameter string (sorted by encoded key)
    const paramPairs = Object.keys(params).sort().map(k => `${percentEncode(k)}=${percentEncode(params[k])}`);
    const paramString = paramPairs.join('&');

    const baseString = `POST&${percentEncode(url)}&${percentEncode(paramString)}`;
    const signingKey = `${percentEncode(apiSecret)}&${percentEncode(accessSecret)}`;
    const signature = hmacSha1Base64(signingKey, baseString);

    const authHeader = 'OAuth ' + Object.keys(oauth).map(k => `${percentEncode(k)}="${percentEncode(oauth[k])}"`).join(', ') + `, oauth_signature="${percentEncode(signature)}"`;

    const body = `status=${percentEncode(status)}`;

    try {
        const resp = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: authHeader,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body
        });

        const text = await resp.text();
        if (!resp.ok) {
            return { ok: false, status: resp.status, body: text };
        }

        return { ok: true, status: resp.status, body: text };
    } catch (e) {
        return { ok: false, error: e && e.message ? e.message : String(e) };
    }
}

(async () => {
    try {
        if (!fs.existsSync(POSTS_FILE)) {
            console.log('No new posts file');
            process.exit(0);
        }

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

        // Dedupe by URL within this run
        const seen = new Set();

        for (const post of posts) {
            const { title, url } = post;
            if (!url) continue;
            if (seen.has(url)) {
                console.log(`[Twitter] Skipping duplicate URL in payload: ${url}`);
                continue;
            }
            // Cross-run ledger skip
            try {
                if (ledger.isPosted(url, 'twitter')) {
                    console.log('[Twitter] Skipping (already posted)');
                    continue;
                }
            } catch (e) {
                // ignore ledger errors
            }
            seen.add(url);

            // Build message (simple truncation to 280 chars)
            const fixedPart = formatMessage('', url);
            const maxTotal = 280;
            const reserved = fixedPart.length;
            const maxTitle = Math.max(0, maxTotal - reserved);
            let finalTitle = (title || '').toString();
            if (finalTitle.length > maxTitle) finalTitle = finalTitle.slice(0, maxTitle - 1) + '…';
            const message = formatMessage(finalTitle, url);

            try {
                console.log(`[Twitter] Posting: ${url}`);
                const res = await postStatus(message);
                if (res.ok) {
                    console.log('[Twitter] Success');
                    try {
                        if (MARK_LEDGER) {
                            ledger.markPosted(url, 'twitter');
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
                    console.error('[Twitter] Failed:', res.status || '', res.body || res.error || '');
                }
            } catch (err) {
                console.error('[Twitter] Exception:', err && err.message ? err.message : String(err));
            }

            await new Promise(r => setTimeout(r, 1000));
        }

        process.exit(0);
    } catch (e) {
        console.error(e && e.message ? e.message : String(e));
        process.exit(0);
    }
})();
