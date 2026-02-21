# MySarkariResult Scalable Architecture

This repository holds the fully static, high-performance, AdSense-compliant architecture for MySarkariResult.

## Folder Structure
- `assets/css/base.css` — Global CSS variables, reset, typography, and base layout styles.
- `Jobs/`, `Results/`, `Admit-Card/`, etc. — Core content sections. Each contains a specific CSS file (`jobs.css`) and a reference `template.html`.
- `scripts/generate-sitemaps.js` — Automated sitemap generator that crawls directories and extracts Git dates.
- `.github/workflows/sitemap.yml` — Runs on push to master/main to automatically regenerate sitemaps and ping Google & Bing.

## Creating New Pages
1. Go to the relevant section (e.g., `Jobs/`).
2. Copy `template.html` and rename it appropriately (e.g., `jobs/upsc-civil-service.html`).
3. Replace the `{{title}}`, `{{description}}`, `{{canonical}}`, and `{{schema}}` tags with actual content.
4. Replace `{{content}}` with the semantic HTML representation of the job listing.
5. Push to GitHub! The sitemaps will auto-update.

## AdSense Customization
See `adsense-placement.md` for instructions on integrating real ad code into the reserved `.ad-slot` sections without violating layout rules or incurring CLS penalties.

## Modifying Brand Aesthetics
We use a unified CSS Custom Properties approach. Edit `assets/css/base.css`:
```css
:root {
  --config-primary: #ab183d;
  --config-secondary: #2d3748;
}
```
All buttons, headers, links, and cards will adapt instantly across the entire platform.

## Troubleshooting
- **GitHub Action Failed**: Ensure `fetch-depth: 0` is present so `git log` can deduce dates. 
- **Sitemap Not Appearing**: Verify the `BASE_URL` repository-level variable in GitHub settings matches `https://mysarkariresult.in`. We default to this value as a fallback anyway.
- **Search Engines Not Pinging**: `curl` requests in the action shouldn't block workflows, but check the action log if you want to verify response details.
