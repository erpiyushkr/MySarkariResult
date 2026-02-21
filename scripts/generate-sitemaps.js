const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Determine base URL from environment or use default
const BASE_URL = process.env.BASE_URL || 'https://mysarkariresult.in';
const SECTIONS = ['Jobs', 'Results', 'Admit-Card', 'Answer-Key', 'Syllabus', 'Admission'];

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
    const rootDir = path.resolve(__dirname, '..');

    SECTIONS.forEach(section => {
        const sectionDir = path.join(rootDir, section);
        const htmlFiles = findHtmlFiles(sectionDir);
        
        if (htmlFiles.length === 0) return;

        const urls = htmlFiles.map(file => {
            const relPath = path.relative(rootDir, file).replace(/\\/g, '/');
            const loc = `${BASE_URL}/${relPath}`;
            const lastmod = getFileDate(file);
            return { loc, lastmod };
        });

        const sitemapName = `sitemap-${section.toLowerCase()}.xml`;
        const sitemapPath = path.join(rootDir, sitemapName);
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

    // Add root pages
    const rootHtmlFiles = fs.readdirSync(rootDir).filter(f => f.endsWith('.html') && f !== 'template.html');
    const rootUrls = rootHtmlFiles.map(file => {
        const fullPath = path.join(rootDir, file);
        return {
            loc: `${BASE_URL}/${file}`,
            lastmod: getFileDate(fullPath)
        };
    });

    if (rootUrls.length > 0) {
        const rootSitemapPath = path.join(rootDir, 'sitemap-pages.xml');
        fs.writeFileSync(rootSitemapPath, generateSitemapContent(rootUrls));
        sitemaps.push({
            loc: `${BASE_URL}/sitemap-pages.xml`,
            lastmod: new Date().toISOString()
        });
    }

    const indexPath = path.join(rootDir, 'sitemap.xml');
    const indexContent = generateIndexSitemap(sitemaps);
    fs.writeFileSync(indexPath, indexContent);

    console.log('Sitemaps generated successfully.');
}

main();
