const crypto = require('crypto');
const X_API = 'https://api.twitter.com/2';
const MEDIA_API = 'https://upload.twitter.com/1.1/media/upload.json';

function oauthHeader(method, url, params) {
  const nonce     = crypto.randomBytes(16).toString('hex');
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const oauth = {
    oauth_consumer_key: process.env.X_APP_KEY,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: process.env.X_ACCESS_TOKEN,
    oauth_version: '1.0',
    ...params,
  };
  const paramStr = Object.entries(oauth).sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
  const base = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(paramStr)}`;
  const key  = `${encodeURIComponent(process.env.X_APP_SECRET)}&${encodeURIComponent(process.env.X_ACCESS_SECRET)}`;
  oauth.oauth_signature = crypto.createHmac('sha1', key).update(base).digest('base64');
  return 'OAuth ' + Object.entries(oauth).map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`).join(', ');
}

async function uploadMedia(imageUrl) {
  try {
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return null;
    const buf = await imgRes.arrayBuffer();
    const b64 = Buffer.from(buf).toString('base64');

    const initRes = await fetch(MEDIA_API, {
      method: 'POST',
      headers: { Authorization: oauthHeader('POST', MEDIA_API, {
        command: 'INIT', media_type: 'image/jpeg', total_bytes: String(buf.byteLength),
      }), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ command: 'INIT', media_type: 'image/jpeg', total_bytes: String(buf.byteLength) }).toString(),
    });
    if (!initRes.ok) return null;
    const { media_id_string } = await initRes.json();
    if (!media_id_string) return null;

    const appendForm = new FormData();
    appendForm.append('command', 'APPEND');
    appendForm.append('media_id', media_id_string);
    appendForm.append('segment_index', '0');
    appendForm.append('media_data', b64);
    await fetch(MEDIA_API, {
      method: 'POST',
      headers: { Authorization: oauthHeader('POST', MEDIA_API, { command: 'APPEND', media_id: media_id_string, segment_index: '0' }) },
      body: appendForm,
    });

    await fetch(MEDIA_API, {
      method: 'POST',
      headers: { Authorization: oauthHeader('POST', MEDIA_API, { command: 'FINALIZE', media_id: media_id_string }), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ command: 'FINALIZE', media_id: media_id_string }).toString(),
    });
    return media_id_string;
  } catch { return null; }
}

exports.post = async function post(item, imageUrl, caption) {
  if (!process.env.X_APP_KEY || !process.env.X_APP_SECRET || !process.env.X_ACCESS_TOKEN || !process.env.X_ACCESS_SECRET) {
    throw new Error('X credentials not fully set');
  }

  const template = process.env.X_TEMPLATE || '{title}\n\n{url}';
  let text = template
    .replace(/\{title\}/g,   item.title || '')
    .replace(/\{url\}/g,     item.link || '')
    .replace(/\{caption\}/g, caption);
  if (text.length > 280) text = text.slice(0, 277) + '...';

  const tweet = { text };
  if (imageUrl) {
    const mediaId = await uploadMedia(imageUrl);
    if (mediaId) tweet.media = { media_ids: [mediaId] };
  }

  const auth = oauthHeader('POST', `${X_API}/tweets`, {});
  const res = await fetch(`${X_API}/tweets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: auth },
    body: JSON.stringify(tweet),
  });
  if (!res.ok) throw new Error(`X API (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return { platform: 'x', postId: data?.data?.id };
};
