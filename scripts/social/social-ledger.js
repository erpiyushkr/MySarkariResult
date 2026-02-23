"use strict";
const fs = require('fs');
const path = require('path');

// Ledger path (repo-root relative) — rely on process.cwd() so scripts invoked from CI or locally work
const LEDGER_PATH = path.resolve(process.cwd(), 'assets', 'data', 'social-posts.json');

function safeParse(txt) {
    try {
        return JSON.parse(txt);
    } catch (e) {
        return null;
    }
}

function loadLedger() {
    try {
        if (!fs.existsSync(LEDGER_PATH)) {
            return { posted: [] };
        }
        const txt = fs.readFileSync(LEDGER_PATH, 'utf8');
        const parsed = safeParse(txt);
        if (!parsed || !Array.isArray(parsed.posted)) return { posted: [] };
        return parsed;
    } catch (e) {
        // never throw
        return { posted: [] };
    }
}

function saveLedger(ledger) {
    try {
        const dir = path.dirname(LEDGER_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2), 'utf8');
    } catch (e) {
        // swallow — CI must not fail
    }
}

function normalizeUrl(u) {
    if (!u) return '';
    return u.trim();
}

function isPosted(url, platform) {
    try {
        const ledger = loadLedger();
        const u = normalizeUrl(url);
        for (const entry of ledger.posted) {
            if ((entry.url || '') === u) {
                if (!platform) return true;
                return Array.isArray(entry.platforms) && entry.platforms.includes(platform);
            }
        }
        return false;
    } catch (e) {
        return false;
    }
}

function markPosted(url, platform) {
    try {
        const ledger = loadLedger();
        const u = normalizeUrl(url);
        let found = null;
        for (const entry of ledger.posted) {
            if ((entry.url || '') === u) {
                found = entry;
                break;
            }
        }
        const today = new Date().toISOString().slice(0, 10);
        if (!found) {
            const entry = { url: u, date: today, platforms: [] };
            if (platform && !entry.platforms.includes(platform)) entry.platforms.push(platform);
            ledger.posted.unshift(entry);
        } else {
            if (platform && !Array.isArray(found.platforms)) found.platforms = [];
            if (platform && !found.platforms.includes(platform)) found.platforms.push(platform);
            if (!found.date) found.date = today;
        }
        saveLedger(ledger);
        return true;
    } catch (e) {
        return false;
    }
}

module.exports = {
    loadLedger,
    saveLedger,
    isPosted,
    markPosted,
    LEDGER_PATH,
};
