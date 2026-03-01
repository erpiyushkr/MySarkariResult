#!/usr/bin/env node
// scripts/validate-automation.js
// Basic CI validations: JSON schema for indexes, duplicate slug detection

const fs = require('fs');
const path = require('path');

const path = require('path');
const REPO_ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(REPO_ROOT, 'assets', 'data');
const { SECTIONS, BASE_URL } = require('./automation-config');

function normalizeUrl(u) {
    if (!u) return u;
    return u.trim();
}

function validateJsonArray(file) {
    try {
        const txt = fs.readFileSync(file, 'utf8');
        const json = JSON.parse(txt);
        if (!Array.isArray(json)) return `${file}: root is not an array`;
        for (const item of json) {
            if (!item.title || (!item.link && !item.url)) return `${file}: item missing title or link/url`;
        }
        // detect duplicate links
        const seen = new Set();
        for (const item of json) {
            const link = normalizeUrl(item.link || item.url);
            if (seen.has(link)) return `${file}: duplicate link ${link}`;
            seen.add(link);
        }
        return null;
    } catch (e) {
        return `${file}: invalid json (${e && e.message ? e.message : e})`;
    }
}

function verifyHtmlExistsForJson(file) {
    try {
        const txt = fs.readFileSync(file, 'utf8');
        const json = JSON.parse(txt);
        for (const item of json) {
            const url = normalizeUrl(item.link || item.url);
            if (!url) return `${file}: entry missing url`;
            // map URL to repo path: strip base
            if (!url.startsWith(BASE_URL)) return `${file}: url not using BASE_URL ${url}`;
            const rel = url.slice(BASE_URL.length + 1); // remove leading /
            const candidate = path.join(REPO_ROOT, rel);
            if (!fs.existsSync(candidate)) return `${file}: referenced HTML missing ${candidate}`;
        }
        return null;
    } catch (e) {
        return `${file}: invalid json (${e && e.message ? e.message : e})`;
    }
}

function main() {
    if (!fs.existsSync(DATA_DIR)) {
        console.error('assets/data missing');
        process.exit(2);
    }
    // Validate each configured section file
    let errors = 0;
    const discoveredLinks = new Map(); // link -> section

    for (const s of SECTIONS) {
        const fp = path.join(DATA_DIR, s.json);
        if (!fs.existsSync(fp)) {
            console.warn(`WARN: Missing JSON for section ${s.dir} -> expected ${fp}`);
            continue;
        }
        const err = validateJsonArray(fp);
        if (err) {
            console.error('ERROR:', err);
            errors++;
            continue;
        }
        const v2 = verifyHtmlExistsForJson(fp);
        if (v2) {
            console.error('ERROR:', v2);
            errors++;
            continue;
        }

        // gather links to detect cross-section duplicates
        const arr = JSON.parse(fs.readFileSync(fp, 'utf8'));
        for (const item of arr) {
            const link = normalizeUrl(item.link || item.url);
            if (!link) continue;
            if (discoveredLinks.has(link) && discoveredLinks.get(link) !== s.dir) {
                console.error(`ERROR: Duplicate URL across sections: ${link} found in ${discoveredLinks.get(link)} and ${s.dir}`);
                errors++;
            } else {
                discoveredLinks.set(link, s.dir);
            }
        }
        console.log('OK:', s.json);
    }

    // Quick sitemap check: ensure sitemap files exist and include all discovered links
    try {
        const sitemapIndex = path.join(REPO_ROOT, 'sitemap.xml');
        if (fs.existsSync(sitemapIndex)) {
            const idx = fs.readFileSync(sitemapIndex, 'utf8');
            for (const s of SECTIONS) {
                const sitemapName = `sitemap-${s.dir.toLowerCase()}.xml`;
                const sitemapPath = path.join(REPO_ROOT, sitemapName);
                if (!fs.existsSync(sitemapPath)) {
                    console.warn(`WARN: Missing sitemap for section ${s.dir}: ${sitemapName}`);
                    continue;
                }
                const content = fs.readFileSync(sitemapPath, 'utf8');
                // spot check: each link in discoveredLinks that belongs to this section must appear
                for (const [link, sec] of discoveredLinks.entries()) {
                    if (sec !== s.dir) continue;
                    if (!content.includes(link)) {
                        console.error(`ERROR: Sitemap ${sitemapName} missing link ${link}`);
                        errors++;
                    }
                }
                console.log('OK sitemap:', sitemapName);
            }
        } else {
            console.warn('WARN: sitemap.xml missing');
        }
    } catch (e) {
        console.error('ERROR validating sitemaps:', e && e.message ? e.message : e);
        errors++;
    }

    if (errors > 0) process.exit(1);
    else process.exit(0);
}

if (require.main === module) main();
