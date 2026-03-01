#!/usr/bin/env node
// scripts/generate-jobs-json.js
// Deterministically regenerate assets/data/jobs.json from Jobs/*.html

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const JOBS_DIR = path.join(REPO_ROOT, 'Jobs');
const OUT_PATH = path.join(REPO_ROOT, 'assets', 'data', 'jobs.json');
const BASE_URL = process.env.BASE_URL || 'https://mysarkariresult.in';

function listHtmlFiles(dir) {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir).filter(f => f.endsWith('.html')).map(f => path.join(dir, f));
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

function extractDateFromHtmlFile(filePath) {
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
    // fallback to git commit date (earliest commit)
    try {
        const out = execSync(`git log --format=%as -- "${filePath}"`, { cwd: REPO_ROOT }).toString().trim();
        if (out) {
            const lines = out.split('\n');
            return lines[lines.length - 1];
        }
    } catch (e) { }
    // fallback to file mtime
    try {
        return fs.statSync(filePath).mtime.toISOString().slice(0, 10);
    } catch (e) { return new Date().toISOString().slice(0, 10); }
}

function normalizeDate(input) {
    if (!input) return null;
    const iso = input.match(/(\d{4}-\d{2}-\d{2})/);
    if (iso) return iso[1];
    const parsed = Date.parse(input);
    if (!isNaN(parsed)) return new Date(parsed).toISOString().slice(0, 10);
    return null;
}

function slugFromFile(filePath) {
    return path.basename(filePath, '.html');
}

function buildEntries() {
    const files = listHtmlFiles(JOBS_DIR);
    const entries = [];
    for (const f of files) {
        try {
            const html = fs.readFileSync(f, 'utf8');
            const title = extractTitle(html) || slugFromFile(f).replace(/[-_]/g, ' ');
            const date = extractDateFromHtmlFile(f) || new Date().toISOString().slice(0, 10);
            const rel = path.relative(REPO_ROOT, f).replace(/\\/g, '/');
            const link = `${BASE_URL}/${rel}`;
            entries.push({ title, link, date });
        } catch (e) {
            console.error('Failed to process', f, e && e.message ? e.message : e);
        }
    }
    // de-duplicate by link
    const map = new Map();
    for (const e of entries) {
        if (!map.has(e.link)) map.set(e.link, e);
    }
    const deduped = Array.from(map.values());
    // sort by date desc then by link
    deduped.sort((a, b) => {
        if (a.date === b.date) return a.link.localeCompare(b.link);
        return (b.date || '').localeCompare(a.date || '');
    });
    return deduped;
}

function writeOut(arr) {
    fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
    fs.writeFileSync(OUT_PATH, JSON.stringify(arr, null, 2) + '\n', 'utf8');
    console.log('Wrote', OUT_PATH, 'with', arr.length, 'entries');
}

if (require.main === module) {
    const arr = buildEntries();
    writeOut(arr);
}
