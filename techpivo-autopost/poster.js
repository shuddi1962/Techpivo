/**
 * TechPivo Multi-Platform Auto-Poster
 * Reads https://techpivo.com/rss.xml on a schedule and posts any new
 * article (with its featured image) to whichever platforms you enable.
 *
 * Fully self-hosted — your own API keys, no post caps, no third-party tool.
 */

require('dotenv').config();
const Parser = require('rss-parser');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');

const FEED_URL    = process.env.RSS_FEED_URL || 'https://techpivo.com/rss.xml';
const POSTED_LOG  = path.join(__dirname, 'posted.json');
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || '*/15 * * * *';

const parser = new Parser({
  customFields: { item: [['media:content', 'mediaContent']] },
});

// ── Platform loader (lazy) ───────────────────────────────────────────────
function loadPlatform(name) {
  try {
    return require(`./platforms/${name}`);
  } catch {
    return null;
  }
}

const PLATFORMS = [
  { name: 'Facebook',         key: 'ENABLE_FACEBOOK',         file: 'facebook' },
  { name: 'Instagram',        key: 'ENABLE_INSTAGRAM',        file: 'instagram' },
  { name: 'Threads',          key: 'ENABLE_THREADS',          file: 'threads' },
  { name: 'LinkedIn',         key: 'ENABLE_LINKEDIN',         file: 'linkedin' },
  { name: 'X',                key: 'ENABLE_X',                file: 'x' },
  { name: 'Telegram',         key: 'ENABLE_TELEGRAM',         file: 'telegram' },
  { name: 'Reddit',           key: 'ENABLE_REDDIT',           file: 'reddit' },
  { name: 'WhatsApp',         key: 'ENABLE_WHATSAPP',         file: 'whatsapp' },
  { name: 'Medium',           key: 'ENABLE_MEDIUM',           file: 'medium' },
  { name: 'DevTo',            key: 'ENABLE_DEVTO',            file: 'devto' },
  { name: 'Hashnode',         key: 'ENABLE_HASHNODE',         file: 'hashnode' },
  { name: 'Pinterest',        key: 'ENABLE_PINTEREST',        file: 'pinterest' },
  { name: 'YouTubeCommunity', key: 'ENABLE_YOUTUBE_COMMUNITY', file: 'youtube_community' },
];

// ── posted.json ledger ───────────────────────────────────────────────────
function loadPosted() {
  if (!fs.existsSync(POSTED_LOG)) return {};
  try { return JSON.parse(fs.readFileSync(POSTED_LOG, 'utf8')); }
  catch { return {}; }
}
function savePosted(state) {
  fs.writeFileSync(POSTED_LOG, JSON.stringify(state, null, 2));
}

// ── Image extraction ─────────────────────────────────────────────────────
function extractImage(item) {
  if (item.enclosure && item.enclosure.url) return item.enclosure.url;
  if (item.mediaContent && item.mediaContent.$ && item.mediaContent.$.url) {
    return item.mediaContent.$.url;
  }
  // fallback: some feeds embed it in a <media:content> string
  if (typeof item['media:content'] === 'string' && item['media:content']) {
    const m = item['media:content'].match(/url="([^"]+)"/);
    if (m) return m[1];
  }
  return null;
}

// ── Default caption builder (platforms can override via env templates) ───
function defaultCaption(item) {
  return `${item.title || ''}\n\nRead more: ${item.link || ''}`;
}

// ── Main run ─────────────────────────────────────────────────────────────
async function runOnce() {
  console.log(`[${new Date().toISOString()}] Checking feed: ${FEED_URL}`);

  let feed;
  try {
    feed = await parser.parseURL(FEED_URL);
  } catch (err) {
    console.error(`Feed parse failed: ${err.message}`);
    return;
  }

  const posted  = loadPosted();
  const enabled = PLATFORMS.filter(p => process.env[p.key] === 'true');

  if (enabled.length === 0) {
    console.log('No platforms enabled — set ENABLE_* flags in .env');
    return;
  }

  // Process oldest-first so backlog catches up chronologically
  const items = [...(feed.items || [])].reverse();

  for (const item of items) {
    const key = item.guid || item.link;
    if (!key) continue;

    const imageUrl = extractImage(item);
    if (!imageUrl) {
      console.log(`  ⏭  "${item.title}" — no image, skipping`);
      continue;
    }

    const caption = defaultCaption(item);
    posted[key] = posted[key] || {};

    for (const p of enabled) {
      if (posted[key][p.name]) continue; // already posted

      const mod = loadPlatform(p.file);
      if (!mod) { console.warn(`  ⚠  No module for "${p.file}"`); continue; }

      console.log(`  → ${p.name}: "${item.title}"`);
      try {
        const result = await mod.post(item, imageUrl, caption);
        posted[key][p.name] = true;
        savePosted(posted);
        console.log(`    ✓ ${p.name} — ${result.postId || 'OK'}`);
      } catch (err) {
        console.error(`    ✗ ${p.name}: ${err.message.slice(0, 200)}`);
        // not marked posted → will retry next run
      }
    }
  }

  console.log(`[${new Date().toISOString()}] Done.`);
}

// ── Entry ────────────────────────────────────────────────────────────────
if (process.argv.includes('--once')) {
  runOnce().catch(err => { console.error('Fatal:', err); process.exit(1); });
} else {
  runOnce().catch(err => console.error('Initial run failed:', err));
  cron.schedule(CRON_SCHEDULE, () => {
    runOnce().catch(err => console.error('Scheduled run failed:', err));
  });
  const names = enabledNames();
  console.log(`Auto-poster running. Enabled: ${names.length ? names.join(', ') : 'none'}`);
  console.log(`Schedule: ${CRON_SCHEDULE}`);
}

function enabledNames() {
  return PLATFORMS.filter(p => process.env[p.key] === 'true').map(p => p.name);
}
