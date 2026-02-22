#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const TMP_FILE = '/tmp/new-posts.json';

function readTmp() {
  if (!fs.existsSync(TMP_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(TMP_FILE, 'utf8'));
  } catch (e) {
    console.error('Invalid JSON in', TMP_FILE);
    return [];
  }
}

function findJsonForSection(section) {
  const files = fs.readdirSync(path.join(REPO_ROOT, 'assets', 'data'))
    .filter(f => f.endsWith('.json'));
  const lname = section.toLowerCase();
  // direct match
  for (const f of files) {
    const base = path.basename(f, '.json').toLowerCase();
    if (base === lname) return path.join(REPO_ROOT, 'assets', 'data', f);
  }
  // plural match
  for (const f of files) {
    const base = path.basename(f, '.json').toLowerCase();
    if (base === lname + 's' || (lname + 's') === base) return path.join(REPO_ROOT, 'assets', 'data', f);
  }
  // contains match
  for (const f of files) {
    const base = path.basename(f, '.json').toLowerCase();
    if (base.includes(lname) || lname.includes(base)) return path.join(REPO_ROOT, 'assets', 'data', f);
  }
  return null;
}

function extractDateFromHtml(url) {
  try {
    // url like https://mysarkariresult.in/Jobs/slug.html or /Jobs/slug.html
    const parts = url.replace(/^https?:\/\//, '').split('/');
    // find path from repo root
    const repoPathIndex = parts.indexOf('');
    // simpler: find first segment that matches a top-level dir in repo
    const candidate = parts.find((p, i) => fs.existsSync(path.join(REPO_ROOT, p)));
    // build relative path
    let relPath = url;
    if (url.startsWith('http')) {
      const idx = url.indexOf('/', url.indexOf('//') + 2);
      relPath = url.slice(idx);
    }
    const localPath = path.join(REPO_ROOT, relPath.replace(/^\//, ''));
    if (fs.existsSync(localPath)) {
      const html = fs.readFileSync(localPath, 'utf8');
      // try meta date
      const metaDate = html.match(/<meta[^>]+name=["']?date["']?[^>]+content=["']([^"']+)["'][^>]*>/i);
      if (metaDate) return normalizeDate(metaDate[1]);
      const ld = html.match(/"datePublished"\s*:\s*"([0-9T:\-+]+)"/i);
      if (ld) return normalizeDate(ld[1].slice(0, 10));
      const lastUpd = html.match(/Last Updated:\s*([0-9]{1,2}\s+\w+\s+[0-9]{4}|[0-9]{4}-[0-9]{2}-[0-9]{2})/i);
      if (lastUpd) return normalizeDate(lastUpd[1]);
      // fallback to git
      try {
        const out = execSync(`git log --format=%as -- "${localPath}"`, { cwd: REPO_ROOT }).toString().trim();
        if (out) {
          const lines = out.split('\n');
          return lines[lines.length - 1];
        }
      } catch (e) {
        // ignore
      }
    }
  } catch (e) {
    // ignore
  }
  return new Date().toISOString().slice(0, 10);
}

function normalizeDate(input) {
  if (!input) return null;
  const iso = input.match(/(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  const parsed = Date.parse(input);
  if (!isNaN(parsed)) return new Date(parsed).toISOString().slice(0, 10);
  return null;
}

function updateIndexes() {
  const posts = readTmp();
  if (!posts || posts.length === 0) {
    console.log('No new posts to update');
    return;
  }

  for (const p of posts) {
    const title = p.title || '';
    const url = p.url || p.link || '';
    if (!url) {
      console.warn('Skipping post with no URL:', title);
      continue;
    }

    // extract section from URL: /Section/slug.html
    const m = url.match(/https?:\/\/(?:[^\/]+)\/(\w[\w-]*)\//i);
    const section = (m && m[1]) ? m[1] : (p.section || '');
    if (!section) {
      console.warn('Cannot determine section for', url);
      continue;
    }

    const jsonPath = findJsonForSection(section);
    if (!jsonPath) {
      console.warn('No JSON index found for section', section);
      continue;
    }

    let arr = [];
    try {
      const raw = fs.readFileSync(jsonPath, 'utf8');
      arr = JSON.parse(raw);
      if (!Array.isArray(arr)) arr = [];
    } catch (e) {
      console.warn('Malformed or missing JSON at', jsonPath, '- initializing new array');
      arr = [];
    }

    // Normalize link as absolute URL
    const linkAbs = url;
    // dedupe
    const exists = arr.some(item => (item.link || item.url || '') === linkAbs);
    if (exists) {
      console.log('Skipped (already exists) ->', linkAbs);
      continue;
    }

    const date = extractDateFromHtml(url) || new Date().toISOString().slice(0, 10);
    const entry = { title, link: linkAbs, date };
    arr.unshift(entry);

    try {
      fs.writeFileSync(jsonPath, JSON.stringify(arr, null, 2) + '\n', 'utf8');
      console.log('Updated', path.relative(REPO_ROOT, jsonPath), 'with', linkAbs);
    } catch (e) {
      console.error('Failed to write', jsonPath, e && e.message ? e.message : e);
    }
  }
}

if (require.main === module) updateIndexes();
