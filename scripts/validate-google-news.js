#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const IGNORE = new Set(['assets', 'scripts', 'components', 'templates', 'node_modules', '.github', '.git', '.idea']);

function listHtml() {
    const files = [];
    const entries = fs.readdirSync(REPO_ROOT, { withFileTypes: true });
    for (const d of entries) {
        if (!d.isDirectory()) continue;
        if (IGNORE.has(d.name)) continue;
        const dir = path.join(REPO_ROOT, d.name);
        try {
            const childs = fs.readdirSync(dir);
            for (const f of childs) {
                if (f.endsWith('.html')) files.push(path.join(dir, f));
            }
        } catch (e) { }
    }
    return files;
}

function checkFile(file) {
    const html = fs.readFileSync(file, 'utf8');
    if (!/<\/head>/i.test(html) || html.trim().length < 100) {
        // skip tiny or template/index files without a head
        return null;
    }
    const missing = [];
    if (!/<meta[^>]+property=["']og:title["'][^>]*>/i.test(html)) missing.push('og:title');
    if (!/<meta[^>]+property=["']og:type["'][^>]*content=["']article["'][^>]*>/i.test(html)) missing.push('og:type');
    if (!/<meta[^>]+property=["']og:url["'][^>]*>/i.test(html)) missing.push('og:url');
    if (!/<meta[^>]+property=["']article:published_time["'][^>]*>/i.test(html)) missing.push('article:published_time');
    return missing;
}

function main() {
    const files = listHtml();
    let errors = 0;
    for (const f of files) {
        const missing = checkFile(f);
        if (missing === null) continue; // skipped small or headless files
        if (missing.length) {
            errors++;
            console.log(path.relative(REPO_ROOT, f), 'missing:', missing.join(', '));
        }
    }
    if (errors === 0) {
        console.log('All files have the required Google News meta tags.');
        process.exit(0);
    }
    console.log(`Files missing tags: ${errors}`);
    process.exit(1);
}

if (require.main === module) main();
