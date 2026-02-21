# Social Media Notifications Automation

This directory contains scripts that automate sending notifications to Telegram and Twitter whenever a **new post** is added to the repository.

## How It Works

1. **Detection** (`detect-new-post.js`): Uses `git diff` to compare the push against the previous commit. It identifies any newly added HTML files inside the main content folders (e.g., `Jobs/`, `Results/`) or any newly appended JSON objects in `/assets/data/*.json`.
2. **Title & URL Extraction**: The title is gracefully extracted from the newly added JSON post or by reading the newly added HTML file. The canonical URL is created dynamically based on the source structure.
3. **Notification Scripts** (`telegram-notify.js`, `twitter-notify.js`): Parse the discovered new entries and send notifications using simple fetch or Twitter API integration using the secrets configured in GitHub.

## Local Configuration & Environment Variables

For local testing, you can create a `.env` file inside this `scripts/social` directory (Do NOT commit this file).

**Example `.env`:**
```ini
BASE_URL="https://mysarkariresult.in"
# Leave testing SHAs blank if you want it to diff against the most recent local commit (HEAD~1 to HEAD)
# GITHUB_PREV_SHA="somehash"
# GITHUB_CURR_SHA="somehash"

TELEGRAM_BOT_TOKEN="your-bot-token"
TELEGRAM_CHANNEL_ID="@your_channel_handle"

TWITTER_API_KEY="your-twitter-api-key"
TWITTER_API_SECRET="your-twitter-api-secret"
TWITTER_ACCESS_TOKEN="your-twitter-access-token"
TWITTER_ACCESS_SECRET="your-twitter-access-secret"
```

## Running Locally

1. Install dependencies:
   ```bash
   npm ci
   ```
2. Make a test commit by adding a dummy HTML file or editing a JSON array in `/assets/data/`.
3. Run the detection step:
   ```bash
   node detect-new-post.js
   ```
4. Verify the outputs:
   This will create a `/tmp/new-posts.json` file. Check that the output properly extracted the title and url of your dummy entry.

### Mocking the Send Operations

If you wish to test formatting without posting online, you can keep the sensitive variables (`TELEGRAM_BOT_TOKEN` and `TWITTER_API_KEY`) unset or empty in your local `.env`. The notify scripts will smartly skip sending the payload while logging the warning, letting you dry-run the integration safely!

```bash
node telegram-notify.js
node twitter-notify.js
```

## GitHub Actions & Feature Branch Testing

This automated workflow automatically targets `main` and `feature/global-social-automation`. 

**Secrets Setup Requirement:**
In GitHub, go to **Settings > Secrets and variables > Actions** and add the variables listed above.

## Publishing & Merging Steps

1. Review this PR (`feature/global-social-automation`).
2. Verify that GitHub Actions run successfully. Note that if no new files were pushed or if the previous commit is unavailable, detection might bypass sending gracefully.
3. If everything is stable, it's safe to merge to `main`. Existing automated sitemap tasks remain entirely untouched and decoupled from this feature.
