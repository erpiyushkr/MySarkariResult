#!/usr/bin/env node
/* scripts/update-rss.js
   Reads /tmp/new-posts.json and updates rss.xml in the repo root.
   Idempotent: will not duplicate items by link.
*/

const fs = require('fs');
const path = require('path');

const POSTS_FILE = '/tmp/new-posts.json';
const RSS_FILE = path.resolve(process.cwd(), 'rss.xml');

function toRfc822(dateInput) {
    const d = dateInput ? new Date(dateInput) : new Date();
    return d.toUTCString(); // RFC1123, acceptable for pubDate
}

function makeItem(post) {
    const title = (post.title || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const link = post.url || post.link || post.href || '';
    const pubDate = toRfc822(post.date || new Date());
    return `  <item>\n    <title>${title}</title>\n    <link>${link}</link>\n    <pubDate>${pubDate}</pubDate>\n  </item>`;
}

function ensureTemplate() {
    const now = new Date();
    return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n<channel>\n  <title>MySarkariResult</title>\n  <link>https://mysarkariresult.in/</link>\n  <description>Latest government job posts</description>\n  <lastBuildDate>${now.toUTCString()}</lastBuildDate>\n</channel>\n</rss>`;
}

(async () => {
    try {
        if (!fs.existsSync(POSTS_FILE)) {
            console.log('[update-rss] No new posts file, nothing to do.');
            process.exit(0);
        }

        let posts = [];
        try {
            posts = JSON.parse(fs.readFileSync(POSTS_FILE, 'utf8'));
        } catch (e) {
            console.error('[update-rss] Invalid JSON in /tmp/new-posts.json');
            process.exit(0);
        }

        if (!Array.isArray(posts) || posts.length === 0) {
            console.log('[update-rss] No new posts');
            process.exit(0);
        }

        let rss = '';
        if (fs.existsSync(RSS_FILE)) {
            rss = fs.readFileSync(RSS_FILE, 'utf8');
        } else {
            rss = ensureTemplate();
        }

        // Extract existing links to avoid duplicates
        const existingLinks = new Set();
        const linkRegex = /<link>(.*?)<\/link>/g;
        let m;
        while ((m = linkRegex.exec(rss)) !== null) {
            existingLinks.add(m[1]);
        }

        // Build new items for posts not already present
        const newItems = [];
        for (const post of posts) {
            const link = post.url || post.link || post.href || '';
            if (!link) continue;
            if (existingLinks.has(link)) {
                console.log(`[update-rss] Skipping existing: ${link}`);
                continue;
            }
            newItems.push(makeItem(post));
        }

        if (newItems.length === 0) {
            console.log('[update-rss] No new RSS items to add');
            process.exit(0);
        }

        // Insert new items at top of channel
        const insertPoint = rss.indexOf('<\/channel>');
        if (insertPoint === -1) {
            // malformed, replace with template
            rss = ensureTemplate();
        }

        // Create new channel with items prepended
        const channelOpen = rss.indexOf('<channel>');
        const channelClose = rss.indexOf('<\/channel>');
        if (channelOpen === -1 || channelClose === -1) {
            rss = ensureTemplate();
        }

        const before = rss.slice(0, channelClose);
        const after = rss.slice(channelClose);
        const itemsBlock = newItems.join('\n') + '\n';

        const updated = before.replace(/<lastBuildDate>.*?<\/lastBuildDate>/s, `<lastBuildDate>${new Date().toUTCString()}<\/lastBuildDate>`) + '\n' + itemsBlock + after;

        fs.writeFileSync(RSS_FILE, updated, 'utf8');
        console.log(`[update-rss] Wrote ${newItems.length} new item(s) to ${RSS_FILE}`);
        process.exit(0);
    } catch (e) {
        console.error('[update-rss] Fatal error:', e && e.message ? e.message : String(e));
        process.exit(0);
    }
})();
