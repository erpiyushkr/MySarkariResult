# Global Automation Checklist — MySarkariResult

This checklist documents verification steps for the global automation system implemented in this repository. Follow these steps to validate behavior locally or in CI.

## JSON Auto Update
- [ ] When a new HTML post is added to a section (e.g., `Jobs/`), the `detect-new-post.js` step identifies it and writes `/tmp/new-posts.json`.
- [ ] `scripts/update-json-index.js` reads `/tmp/new-posts.json` and inserts an entry at the top of the matching `assets/data/*.json` file.
- [ ] Entry format: `{ "title": "...", "link": "https://mysarkariresult.in/Section/slug.html", "date": "YYYY-MM-DD" }`.
- [ ] Duplicate URLs are not inserted (deduplication verified).
- [ ] If the target JSON is malformed, the script logs the error and continues with other sections (no hard failure).

## Google News Meta Tags
- [ ] Every post HTML contains the required meta tags:
  - `<meta property="og:title" ...>`
  - `<meta property="og:type" content="article">`
  - `<meta property="og:url" ...>`
  - `<meta property="article:published_time" content="YYYY-MM-DD">`
- [ ] `scripts/add-meta-tags.js` injects missing tags idempotently (won't duplicate existing tags).
- [ ] `scripts/validate-google-news.js` scans posts and reports missing tags (exit non-zero when issues found).

## Social Notifications
- [ ] `scripts/social/telegram-notify.js`, `twitter-notify.js`, `linkedin-notify.js` read `/tmp/new-posts.json`.
- [ ] Each script loops posts and uses `scripts/social/format-message.js` to format messages.
- [ ] Each script guards missing secrets and skips posting with a clear log (does not throw).
- [ ] Twitter uses `twitter-api-v2` (v2 tweet endpoint) and handles missing `twitter-api-v2` gracefully when running locally without `node_modules`.
- [ ] LinkedIn uses `urn:li:organization:${LINKEDIN_ORG_ID}` for the author field.
- [ ] On API errors, scripts log the error but continue processing remaining posts and exit 0.

## Workflow Integration
- [ ] `.github/workflows/social-global.yml` sets `actions/checkout` `fetch-depth: 0` to provide full git history for commit dates.
- [ ] Workflow steps:
  1. Checkout
  2. Setup Node.js 20
  3. `npm ci` in `scripts/social`
  4. Detect new posts (writes `/tmp/new-posts.json`)
  5. Update JSON indexes (`scripts/update-json-index.js`) — only when `has_new == 'true'`
  6. Notify platforms (Telegram/Twitter/LinkedIn) — only when `has_new == 'true'`
- [ ] The workflow tolerates missing secrets, invalid JSON, network/API failures, and always exits 0 for notify job.

## Validation Commands (local)
Run these from repository root to validate locally:

```bash
# Generate or update meta tags (idempotent)
node scripts/add-meta-tags.js

# Run the JSON index updater (reads /tmp/new-posts.json)
node scripts/update-json-index.js

# Validate all posts for Google News meta tags
node scripts/validate-google-news.js

# Run an end-to-end local test harness
node scripts/test-automation.js
```

## Notes
- The system preserves the `link` key in existing JSON files for compatibility and appends a `date` field.
- `actions/checkout` uses `fetch-depth: 0` — this may increase checkout duration but ensures accurate published dates via git history.
- All scripts are CommonJS and suitable for Node.js 20 environment used in Actions.
