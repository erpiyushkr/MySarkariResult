#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const child = require('child_process');

const TMP = '/tmp/new-posts.json';
const REPO_ROOT = path.resolve(__dirname, '..');

function run(cmd, opts = {}) {
  try {
    const out = child.execSync(cmd, { stdio: 'inherit', cwd: REPO_ROOT, ...opts });
    return out;
  } catch (e) {
    // don't throw
  }
}

function makeMock() {
  // choose an existing Jobs post
  const sample = 'Jobs/south-indian-bank-junior-officer-recruitment-2026.html';
  const title = 'SIB Junior Officer Recruitment 2026 Apply Online';
  const url = `https://mysarkariresult.in/${sample}`;
  const obj = [{ title, url, section: 'Jobs' }];
  fs.writeFileSync(TMP, JSON.stringify(obj, null, 2), 'utf8');
  console.log('Wrote mock', TMP);
}

function cleanup() {
  try { fs.unlinkSync(TMP); } catch (e) {}
}

async function main() {
  cleanup();
  makeMock();

  console.log('\n-> Running update-json-index.js');
  run('node scripts/update-json-index.js');

  console.log('\n-> Running validator (validate-google-news.js)');
  run('node scripts/validate-google-news.js');

  console.log('\n-> Running social notify scripts (they will skip if secrets missing)');
  run('node scripts/social/telegram-notify.js');
  run('node scripts/social/twitter-notify.js');
  run('node scripts/social/linkedin-notify.js');

  cleanup();
  console.log('\nTest automation finished.');
}

if (require.main === module) main();
