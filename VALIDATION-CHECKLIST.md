# Validation Checklist

### 1. Detection Verification
- [ ] Add a new HTML file in `Jobs/` (e.g., `test-job.html`) and commit. Does `detect-new-post.js` detect it?
- [ ] Add a new JSON entry to `assets/data/jobs.json` (append a dummy object). Does detection pick it up?
- [ ] Add both an HTML file and a corresponding JSON entry in the same commit. Does deduplication work? (Only one notification per URL.)
- [ ] Add a file in a non‑content folder (e.g., `assets/css/test.html`). Is it ignored?
- [ ] Modify an existing HTML file. Is it ignored? (Only new files should trigger.)

### 2. Message Format Verification
- [ ] For a detected post, check the generated message in `/tmp/new-posts.json` (title, url, section).
- [ ] Run `format-message.js` manually with a sample title and URL. Does it produce the exact format?
- [ ] Verify that the message contains only one emoji (📢) and no other symbols.
- [ ] Verify line breaks: one blank line after first line, one blank line before hashtags.

### 3. Telegram Verification
- [ ] In a test environment (or using a test bot), does the Telegram message appear with URL preview?
- [ ] Is the message exactly as formatted?
- [ ] If secrets are missing, does the step skip gracefully with a log?

### 4. Twitter Verification
- [ ] Does the tweet match the formatted message?
- [ ] If title is very long, is it truncated correctly using the strict algorithm? (Check that URL and hashtags remain.)
- [ ] Does the tweet contain the full URL (no shortening)?
- [ ] If secrets missing, skip gracefully.

### 5. LinkedIn Verification
- [ ] Does the LinkedIn post appear on the company page with the correct text?
- [ ] Is it public?
- [ ] If secrets missing, skip gracefully.

### 6. WhatsApp Forwarding Test
- [ ] Forward a Telegram post to a WhatsApp Channel (or a personal chat to test). Does it look clean? No extra characters, line breaks preserved, URL clickable?
- [ ] Does the URL preview appear in WhatsApp (if the client generates one)?

### 7. Workflow Integrity
- [ ] After push to the feature branch, does the workflow run without errors?
- [ ] Are logs printed as expected?
- [ ] Does the workflow **not** interfere with sitemap generation?
- [ ] If no new posts, are the notification steps skipped?

### 8. Safety Checks
- [ ] If all secrets are missing, does the workflow still succeed (exit 0)?
- [ ] If an API temporarily fails, does the workflow log the error but not fail?
- [ ] Are there any hardcoded section names? (Should be none.)
