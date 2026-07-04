const API = 'https://graph.facebook.com/v21.0';

function utmUrl(link) {
  return `${link}${link.includes('?') ? '&' : '?'}utm_source=facebook&utm_medium=social&utm_campaign=techpivo-auto`;
}

exports.post = async function post(item, imageUrl, caption) {
  const pageId = process.env.FB_PAGE_ID;
  const token  = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!pageId || !token) throw new Error('FB_PAGE_ID / FB_PAGE_ACCESS_TOKEN not set');

  const template = process.env.FACEBOOK_TEMPLATE || '{title}\n\nRead more: {url}';
  const message = template
    .replace(/\{title\}/g,   item.title || '')
    .replace(/\{url\}/g,     utmUrl(item.link))
    .replace(/\{caption\}/g, caption)
    .replace(/\{excerpt\}/g, (item.contentSnippet || item.content || '').slice(0, 200));

  const body = new URLSearchParams({ message, access_token: token });
  const res = await fetch(`${API}/${pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`Facebook API (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return { platform: 'facebook', postId: data.id };
};
