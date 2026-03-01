const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Use shared config for sections and base URL
const { REPO_ROOT, BASE_URL, SECTIONS } = require('./automation-config');

function getFileDate(filePath) {
    try {
        // Try getting the last commit time 
        const stdout = execSync(`git log -1 --format=%cI -- "${filePath}"`, { encoding: 'utf8' }).trim();
        if (stdout) {
            return stdout;
        }
    } catch (e) {
        // Fallback to file system mtime
    }
    const stats = fs.statSync(filePath);
    return stats.mtime.toISOString();
}

function findHtmlFiles(dir, fileList = []) {
    if (!fs.existsSync(dir)) return fileList;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            findHtmlFiles(fullPath, fileList);
        } else if (file.endsWith('.html')) {
            fileList.push(fullPath);
        }
    }
    return fileList;
}

function generateSitemapContent(urls) {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    for (const { loc, lastmod } of urls) {
        xml += `  <url>\n`;
        xml += `    <loc>${loc}</loc>\n`;
        xml += `    <lastmod>${lastmod}</lastmod>\n`;
        xml += `  </url>\n`;
    }
    xml += `</urlset>\n`;
    return xml;
}

function generateIndexSitemap(sitemaps) {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    for (const { loc, lastmod } of sitemaps) {
        xml += `  <sitemap>\n`;
        xml += `    <loc>${loc}</loc>\n`;
        if (lastmod) {
            xml += `    <lastmod>${lastmod}</lastmod>\n`;
        }
        xml += `  </sitemap>\n`;
    }
    xml += `</sitemapindex>\n`;
    return xml;
}

function main() {
    const sitemaps = [];

    SECTIONS.forEach(section => {
        const sectionDir = path.join(REPO_ROOT, section.dir);
        const htmlFiles = findHtmlFiles(sectionDir);
        if (htmlFiles.length === 0) return;

        // Deterministic ordering by relative path
        htmlFiles.sort((a, b) => path.relative(REPO_ROOT, a).localeCompare(path.relative(REPO_ROOT, b)));

        const urls = htmlFiles.map(file => {
            const relPath = path.relative(REPO_ROOT, file).replace(/\\/g, '/');
            const loc = `${BASE_URL}/${relPath}`;
            const lastmod = getFileDate(file);
            return { loc, lastmod };
        });

        const sitemapName = `sitemap-${section.dir.toLowerCase()}.xml`;
        const sitemapPath = path.join(REPO_ROOT, sitemapName);
        const sitemapContent = generateSitemapContent(urls);

        if (fs.existsSync(sitemapPath)) {
            const existing = fs.readFileSync(sitemapPath, 'utf8');
            if (existing !== sitemapContent) {
                fs.writeFileSync(sitemapPath, sitemapContent);
            }
        } else {
            fs.writeFileSync(sitemapPath, sitemapContent);
        }

        sitemaps.push({
            loc: `${BASE_URL}/${sitemapName}`,
            lastmod: new Date().toISOString()
        });
    });

    // Root pages
    const rootHtmlFiles = fs.readdirSync(REPO_ROOT).filter(f => f.endsWith('.html') && f !== 'template.html').sort();
    const rootUrls = rootHtmlFiles.map(file => ({ loc: `${BASE_URL}/${file}`, lastmod: getFileDate(path.join(REPO_ROOT, file)) }));

    if (rootUrls.length > 0) {
        const rootSitemapPath = path.join(REPO_ROOT, 'sitemap-pages.xml');
        const content = generateSitemapContent(rootUrls);
        if (fs.existsSync(rootSitemapPath)) {
            const existing = fs.readFileSync(rootSitemapPath, 'utf8');
            if (existing !== content) fs.writeFileSync(rootSitemapPath, content);
        } else {
            fs.writeFileSync(rootSitemapPath, content);
        }
        sitemaps.push({ loc: `${BASE_URL}/sitemap-pages.xml`, lastmod: new Date().toISOString() });
    }

    const indexPath = path.join(REPO_ROOT, 'sitemap.xml');
    const indexContent = generateIndexSitemap(sitemaps);
    if (fs.existsSync(indexPath)) {
        const existing = fs.readFileSync(indexPath, 'utf8');
        if (existing !== indexContent) fs.writeFileSync(indexPath, indexContent);
    } else {
        fs.writeFileSync(indexPath, indexContent);
    }

    console.log('Sitemaps generated successfully.');
}

main();
