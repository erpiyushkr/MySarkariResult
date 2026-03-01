#!/usr/bin/env node
// scripts/generate-section-indexes.js
// Generic deterministic generator for all section JSON indexes

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { REPO_ROOT, BASE_URL, SECTIONS } = require('./automation-config');

function findHtmlFiles(dir, list = []) {
    if (!fs.existsSync(dir)) return list;
    const ents = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of ents) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) findHtmlFiles(full, list);
        else if (e.isFile() && e.name.endsWith('.html')) list.push(full);
    }
    return list;
}

function extractTitle(html) {
    const m = html.match(/<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
    if (m) return m[1].trim();
    const t = html.match(/<title>([^<]+)<\/title>/i);
    if (t) return t[1].trim();
    const h1 = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (h1) return h1[1].trim();
    return null;
}

function normalizeDate(input) {
    if (!input) return null;
    const iso = input.match(/(\d{4}-\d{2}-\d{2})/);
    if (iso) return iso[1];
    const parsed = Date.parse(input);
    if (!isNaN(parsed)) return new Date(parsed).toISOString().slice(0, 10);
    return null;
}

function extractDate(filePath) {
    try {
        const html = fs.readFileSync(filePath, 'utf8');
        const metaDate = html.match(/<meta[^>]+name=["']?date["']?[^>]+content=["']([^"']+)["']/i);
        if (metaDate) return normalizeDate(metaDate[1]);
        const ld = html.match(/"datePublished"\s*:\s*"([0-9T:\-+]+)"/i);
        if (ld) return normalizeDate(ld[1].slice(0, 10));
        const time = html.match(/<time[^>]*>([^<]+)<\/time>/i);
        if (time) return normalizeDate(time[1]);
        const lastUpd = html.match(/Last Updated:\s*([0-9]{4}-[0-9]{2}-[0-9]{2}|[0-9]{1,2}\s+\w+\s+[0-9]{4})/i);
        if (lastUpd) return normalizeDate(lastUpd[1]);
    } catch (e) {
        // ignore
    }
    // fallback to git commit date (last commit that touched the file)
    try {
        const out = execSync(`git log -1 --format=%as -- "${filePath}"`, { cwd: REPO_ROOT }).toString().trim();
        if (out) return out.split('\n')[0];
    } catch (e) { }
    try {
        return fs.statSync(filePath).mtime.toISOString().slice(0, 10);
    } catch (e) { return new Date().toISOString().slice(0, 10); }
}

function slugFromFile(filePath) {
    return path.basename(filePath, '.html');
}

function buildForSection(section) {
    const dirPath = path.join(REPO_ROOT, section.dir);
    const files = findHtmlFiles(dirPath);
    const entries = [];
    for (const f of files) {
        try {
            const html = fs.readFileSync(f, 'utf8');
            const title = extractTitle(html) || slugFromFile(f).replace(/[-_]/g, ' ');
            const date = extractDate(f) || new Date().toISOString().slice(0, 10);
            const rel = path.relative(REPO_ROOT, f).replace(/\\/g, '/');
            const link = `${BASE_URL}/${rel}`;
            entries.push({ title, link, date });
        } catch (e) {
            console.error('Failed to process', f, e && e.message ? e.message : e);
        }
    }
    // deterministic: dedupe by link, keep first seen (files sorted by path)
    entries.sort((a, b) => a.link.localeCompare(b.link));
    const map = new Map();
    for (const e of entries) {
        if (!map.has(e.link)) map.set(e.link, e);
    }
    const deduped = Array.from(map.values());
    // stable sort by date desc then link
    deduped.sort((a, b) => {
        if ((a.date || '') === (b.date || '')) return a.link.localeCompare(b.link);
        return (b.date || '').localeCompare(a.date || '');
    });
    return deduped;
}

function writeIfChanged(outPath, arr) {
    const content = JSON.stringify(arr, null, 2) + '\n';
    try {
        if (fs.existsSync(outPath)) {
            const prev = fs.readFileSync(outPath, 'utf8');
            if (prev === content) return false;
        }
        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, content, 'utf8');
        return true;
    } catch (e) {
        console.error('Failed to write', outPath, e && e.message ? e.message : e);
        return false;
    }
}

function main() {
    const changed = [];
    for (const section of SECTIONS) {
        const arr = buildForSection(section);
        const outPath = path.join(REPO_ROOT, 'assets', 'data', section.json);
        const did = writeIfChanged(outPath, arr);
        console.log(`Section ${section.dir}: ${arr.length} entries${did ? ' (updated)' : ''}`);
        if (did) changed.push(outPath);
    }
    if (changed.length > 0) {
        console.log('Updated files:', changed.join(', '));
    } else {
        console.log('No changes detected across sections.');
    }
}

if (require.main === module) main();
