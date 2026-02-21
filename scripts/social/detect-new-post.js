const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const REPO_ROOT = path.resolve(__dirname, '../../');
const TEMP_FILE = '/tmp/new-posts.json';
const BASE_URL = process.env.BASE_URL || 'https://mysarkariresult.in';
const IGNORED_FOLDERS = ['assets', 'scripts', 'components', 'templates', 'node_modules', '.github', '.git'];

// Find all valid content directories
function getContentDirectories() {
    const dirs = fs.readdirSync(REPO_ROOT, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.') && !IGNORED_FOLDERS.includes(dirent.name))
        .map(dirent => dirent.name);

    const validContentDirs = [];
    for (const dir of dirs) {
        const dirPath = path.join(REPO_ROOT, dir);
        const files = fs.readdirSync(dirPath);
        if (files.some(f => f.endsWith('.html'))) {
            validContentDirs.push(dir);
        }
    }
    return validContentDirs;
}

// Extract title from HTML file content
function extractTitleFromHtml(htmlPath) {
    try {
        const html = fs.readFileSync(htmlPath, 'utf8');
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch && titleMatch[1].trim()) return titleMatch[1].trim();

        const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
        if (h1Match && h1Match[1].trim()) return h1Match[1].trim();
    } catch (e) {
        console.error(`Error reading HTML file ${htmlPath}:`, e.message);
    }
    const basename = path.basename(htmlPath, '.html');
    return basename.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Get added HTML files from Git
function getAddedHtmlPosts(contentDirs) {
    const posts = [];
    try {
        const prevSha = process.env.GITHUB_PREV_SHA || 'HEAD~1';
        const currSha = process.env.GITHUB_CURR_SHA || 'HEAD';
        
        let diffCmd = `git diff --name-only --diff-filter=A ${prevSha} ${currSha}`;
        // Fallback for local testing if HEAD~1 is not available
        try {
            execSync(`git log -1 ${prevSha} >/dev/null 2>&1`);
        } catch {
            diffCmd = `git diff --name-only --diff-filter=A HEAD`; 
        }

        const output = execSync(diffCmd).toString();
        const files = output.split('\n').map(l => l.trim()).filter(Boolean);

        for (const file of files) {
            if (!file.endsWith('.html')) continue;

            const parts = file.split('/');
            if (parts.length < 2) continue; // Skip root HTML files like index.html

            const parentFolder = parts[0];
            if (contentDirs.includes(parentFolder)) {
                // Determine title
                const fullPath = path.join(REPO_ROOT, file);
                const title = extractTitleFromHtml(fullPath);
                
                const url = `${BASE_URL}/${file}`;
                
                posts.push({
                    title,
                    url,
                    section: parentFolder,
                    source: 'html'
                });
            }
        }
    } catch (e) {
        console.error("Error getting added HTML files via git:", e.message);
    }
    return posts;
}

// Generate a unique identifier key for a JSON object
function getJsonEntryKey(entry) {
    if (entry.id) return `id:${entry.id}`;
    if (entry.url) return `url:${entry.url}`;
    if (entry.link) return `link:${entry.link}`;
    if (entry.slug) return `slug:${entry.slug}`;
    if (entry.guid) return `guid:${entry.guid}`;
    if (entry.title && entry.date) return `title_date:${entry.title}_${entry.date}`;
    return null;
}

// Extract canonical URL from a JSON entry
function getUrlFromJsonEntry(entry, sectionVal) {
    if (entry.url && entry.url.includes('.html')) {
        // Assume relative if it doesn't start with http
        if (entry.url.startsWith('http')) return entry.url;
        const cleanUrl = entry.url.startsWith('/') ? entry.url.slice(1) : entry.url;
        return `${BASE_URL}/${cleanUrl}`;
    }
    if (entry.link && entry.link.includes('.html')) {
        if (entry.link.startsWith('http')) return entry.link;
        const cleanLink = entry.link.startsWith('/') ? entry.link.slice(1) : entry.link;
        return `${BASE_URL}/${cleanLink}`;
    }
    if (entry.slug) {
        return `${BASE_URL}/${sectionVal}/${entry.slug}.html`;
    }
    if (entry.id) {
        return `${BASE_URL}/${sectionVal}/${entry.id}.html`;
    }
    return null;
}

// Get title from JSON
function getTitleFromJsonEntry(entry) {
    if (entry.title) return entry.title.trim();
    if (entry.name) return entry.name.trim();
    if (entry.headline) return entry.headline.trim();
    return null;
}

// Get array of items from a parsed JSON which might not be array at root
function getArrayFromJson(data) {
    if (Array.isArray(data)) return data;
    if (typeof data === 'object' && data !== null) {
        for (const key of Object.keys(data)) {
            if (Array.isArray(data[key])) return data[key];
        }
    }
    return [];
}

// Get new entries from changed JSON files
function getNewJsonPosts(contentDirs) {
    const posts = [];
    try {
        const prevSha = process.env.GITHUB_PREV_SHA || 'HEAD~1';
        const currSha = process.env.GITHUB_CURR_SHA || 'HEAD';

        let diffCmd = `git diff --name-only ${prevSha} ${currSha}`;
        try { execSync(`git log -1 ${prevSha} >/dev/null 2>&1`); } catch { diffCmd = `git diff --name-only HEAD`; }

        const output = execSync(diffCmd).toString();
        const files = output.split('\n').map(l => l.trim()).filter(Boolean);

        for (const relativeFile of files) {
            // Need to look in /assets/data/*.json
            if (!relativeFile.startsWith('assets/data/') || !relativeFile.endsWith('.json')) {
                continue;
            }

            const fileName = path.basename(relativeFile, '.json');
            
            // Normalize section casing by mapping against contentDirs
            // Fallback to simple titlecase
            let sectionName = fileName.charAt(0).toUpperCase() + fileName.slice(1);
            for (const cDir of contentDirs) {
                if (cDir.toLowerCase() === fileName.toLowerCase()) {
                    sectionName = cDir;
                    break;
                }
            }

            let prevRaw = '[]';
            let currRaw = '[]';

            try {
                currRaw = fs.readFileSync(path.join(REPO_ROOT, relativeFile), 'utf8');
            } catch (e) { continue; } // File might have been deleted, ignore

            try {
                // Try reading previous file from git
                prevRaw = execSync(`git show ${prevSha}:${relativeFile} 2>/dev/null`).toString();
            } catch (e) {
                // If it fails, maybe the file was just created
                prevRaw = '[]';
            }

            let prevJson = [];
            let currJson = [];
            try { prevJson = getArrayFromJson(JSON.parse(prevRaw)); } catch (e) { prevJson = []; }
            try { currJson = getArrayFromJson(JSON.parse(currRaw)); } catch (e) { currJson = []; }

            const newEntries = [];

            if (currJson.length > 0) {
                const sampleEntry = currJson[0];
                const identifierMode = getJsonEntryKey(sampleEntry) !== null;

                if (identifierMode) {
                    const prevMap = new Map();
                    for (const pe of prevJson) {
                        const key = getJsonEntryKey(pe);
                        if (key) prevMap.set(key, true);
                    }
                    for (const ce of currJson) {
                        const key = getJsonEntryKey(ce);
                        if (key && !prevMap.has(key)) {
                            newEntries.push(ce);
                        } else if (!key) {
                            // Can't identify, fallback check to prevent skipping silently
                        }
                    }
                } else if (currJson.length > prevJson.length) {
                    console.warn(`[WARN] Falling back to array length comparison for ${relativeFile}`);
                    const diffCount = currJson.length - prevJson.length;
                    newEntries.push(...currJson.slice(-diffCount));
                }
            }

            // Map new entries to posts array
            for (const ne of newEntries) {
                const title = getTitleFromJsonEntry(ne);
                if (!title) {
                    console.warn(`[WARN] Skipping entry: No clear title found in ${relativeFile}`);
                    continue;
                }
                const url = getUrlFromJsonEntry(ne, sectionName);
                if (!url) {
                    console.warn(`[WARN] Skipping entry: Cannot compute valid URL for '${title}' in ${relativeFile}`);
                    continue;
                }
                posts.push({
                    title,
                    url,
                    section: sectionName,
                    source: 'json'
                });
            }
        }
    } catch (e) {
        console.error("Error detecting JSON changes:", e.message);
    }
    return posts;
}

function processPosts() {
    console.log("Analyzing content directories...");
    const contentDirs = getContentDirectories();
    console.log("Found content directories:", contentDirs.join(", "));

    console.log("Checking for HTML additions...");
    const htmlPosts = getAddedHtmlPosts(contentDirs);
    console.log(`Found ${htmlPosts.length} new HTML posts.`);

    console.log("Checking for JSON data additions...");
    const jsonPosts = getNewJsonPosts(contentDirs);
    console.log(`Found ${jsonPosts.length} new JSON entries.`);

    // Deduplicate Map to keep track of URL
    const finalPostsMap = new Map();

    // Prefer JSON posts (added first, HTML posts with same URL won't overwrite due to fallback)
    for (const jp of jsonPosts) {
        finalPostsMap.set(jp.url, jp);
    }

    for (const hp of htmlPosts) {
        if (!finalPostsMap.has(hp.url)) {
            finalPostsMap.set(hp.url, hp);
        } else {
            console.log(`Deduplicated HTML post. URL already detected via JSON: ${hp.url}`);
        }
    }

    const finalPosts = Array.from(finalPostsMap.values());
    console.log(`\nTotal unique new posts to notify: ${finalPosts.length}`);

    if (finalPosts.length > 0) {
        fs.writeFileSync(TEMP_FILE, JSON.stringify(finalPosts, null, 2), 'utf8');
        console.log(`Wrote details to ${TEMP_FILE}`);

        // Write github action output
        const ghOut = process.env.GITHUB_OUTPUT;
        if (ghOut) {
            fs.appendFileSync(ghOut, `has_new=true\n`, 'utf8');
        }
    } else {
        const ghOut = process.env.GITHUB_OUTPUT;
        if (ghOut) {
            fs.appendFileSync(ghOut, `has_new=false\n`, 'utf8');
        }
    }
}

processPosts();
