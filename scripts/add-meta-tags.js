#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const BASE_URL = process.env.BASE_URL || 'https://mysarkariresult.in';
const IGNORE = new Set(['assets', 'scripts', 'components', 'templates', 'node_modules', '.github', '.git', '.idea']);

function listContentHtmlFiles() {
    const files = [];
    const entries = fs.readdirSync(REPO_ROOT, { withFileTypes: true });
    for (const d of entries) {
        if (!d.isDirectory()) continue;
        if (IGNORE.has(d.name)) continue;
        const dir = path.join(REPO_ROOT, d.name);
        try {
            const childs = fs.readdirSync(dir);
            for (const f of childs) {
                if (f.endsWith('.html')) {
                    files.push(path.join(dir, f));
                }
            }
        } catch (e) {
            // ignore
        }
    }
    return files;
}

function extractTitle(html) {
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) return titleMatch[1].trim();
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (h1Match) return h1Match[1].trim();
    return null;
}

function extractExistingMeta(html, prop) {
    const re = new RegExp(`<meta[^>]+${prop}[^>]*>`, 'i');
    return re.test(html);
}

function findPublishedDate(html, filePath) {
    // 1. meta name="date"
    const metaDate = html.match(/<meta[^>]+name=["']?date["']?[^>]+content=["']([^"']+)["'][^>]*>/i);
    if (metaDate) return normalizeDate(metaDate[1]);

    // 2. JSON-LD datePublished
    const ld = html.match(/"datePublished"\s*:\s*"([0-9T:\-+]+)"/i);
    if (ld) return normalizeDate(ld[1].slice(0, 10));

    // 3. time tag
    const time = html.match(/<time[^>]*>([^<]+)<\/time>/i);
    if (time) return normalizeDate(time[1]);

    // 4. Last Updated: 21 February 2026 or Last Updated: 2026-02-21
    const lastUpd = html.match(/Last Updated:\s*([0-9]{1,2}\s+\w+\s+[0-9]{4}|[0-9]{4}-[0-9]{2}-[0-9]{2})/i);
    if (lastUpd) return normalizeDate(lastUpd[1]);

    // 5. Fallback to git earliest commit date for file
    try {
        const out = execSync(`git log --format=%as -- "${filePath}"`, { cwd: REPO_ROOT }).toString().trim();
        if (out) {
            const lines = out.split('\n');
            const earliest = lines[lines.length - 1];
            if (earliest) return earliest.trim();
        }
    } catch (e) {
        // ignore
    }

    // 6. final fallback: today
    const d = new Date();
    return d.toISOString().slice(0, 10);
}

function normalizeDate(input) {
    if (!input) return null;
    // If already YYYY-MM-DD
    const iso = input.match(/(\d{4}-\d{2}-\d{2})/);
    if (iso) return iso[1];

    // Try parse common formats like '21 February 2026' or 'Feb 21, 2026'
    const parsed = Date.parse(input);
    if (!isNaN(parsed)) return new Date(parsed).toISOString().slice(0, 10);

    return null;
}

function ensureMetaTags(filePath) {
    let html = fs.readFileSync(filePath, 'utf8');
    const lower = filePath.replace(REPO_ROOT + path.sep, '').split(path.sep).join('/');
    const relUrl = '/' + lower;
    const canonicalUrl = `${BASE_URL}${relUrl}`;

    const need = [];
    const hasOgTitle = /<meta[^>]+property=["']og:title["'][^>]*>/i.test(html);
    const hasOgType = /<meta[^>]+property=["']og:type["'][^>]*content=["']article["'][^>]*>/i.test(html);
    const hasOgUrl = /<meta[^>]+property=["']og:url["'][^>]*>/i.test(html);
    const hasArticleTime = /<meta[^>]+property=["']article:published_time["'][^>]*>/i.test(html);

    if (!hasOgTitle) need.push({ prop: 'og:title' });
    if (!hasOgType) need.push({ prop: 'og:type', value: 'article' });
    if (!hasOgUrl) need.push({ prop: 'og:url' });
    if (!hasArticleTime) need.push({ prop: 'article:published_time' });

    if (need.length === 0) return false; // nothing to do

    const title = extractTitle(html) || path.basename(filePath, '.html').replace(/[-_]/g, ' ');
    const pubDate = findPublishedDate(html, filePath) || new Date().toISOString().slice(0, 10);

    const tags = [];
    for (const item of need) {
        if (item.prop === 'og:title') {
            tags.push(`<meta property="og:title" content="${escapeHtml(title)}">`);
        } else if (item.prop === 'og:type') {
            tags.push(`<meta property="og:type" content="article">`);
        } else if (item.prop === 'og:url') {
            tags.push(`<meta property="og:url" content="${canonicalUrl}">`);
        } else if (item.prop === 'article:published_time') {
            tags.push(`<meta property="article:published_time" content="${pubDate}">`);
        }
    }

    // Insert tags before </head>
    if (/<\/head>/i.test(html)) {
        html = html.replace(/<\/head>/i, tags.join('\n    ') + '\n</head>');
        fs.writeFileSync(filePath, html, 'utf8');
        return true;
    }
    return false;
}

function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function main() {
    const files = listContentHtmlFiles();
    let changed = 0;
    for (const f of files) {
        try {
            if (ensureMetaTags(f)) {
                console.log('Updated meta tags in', path.relative(REPO_ROOT, f));
                changed++;
            }
        } catch (e) {
            console.error('Error processing', f, e && e.message ? e.message : e);
        }
    }
    console.log(`Done. Files updated: ${changed}`);
    process.exit(0);
}

if (require.main === module) main();
