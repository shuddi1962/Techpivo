const GRAPH_VERSION = process.env.GRAPH_API_VERSION || 'v21.0';

exports.post = async function post(item, imageUrl, caption) {
  const pageId = process.env.FB_PAGE_ID;
  const token  = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!pageId || !token) throw new Error('FB_PAGE_ID / FB_PAGE_ACCESS_TOKEN not set');

  const template = process.env.FACEBOOK_TEMPLATE || '{title}\n\nRead more: {url}';
  const text = template
    .replace(/\{title\}/g,   item.title || '')
    .replace(/\{url\}/g,     item.link || '')
    .replace(/\{caption\}/g, caption)
    .replace(/\{excerpt\}/g, (item.contentSnippet || item.content || '').slice(0, 200));

  // Use /photos endpoint when an image is available — attaches the photo
  // directly. Falls back to /feed for text-only link shares.
  const endpoint = imageUrl
    ? `https://graph.facebook.com/${GRAPH_VERSION}/${pageId}/photos`
    : `https://graph.facebook.com/${GRAPH_VERSION}/${pageId}/feed`;

  const params = new URLSearchParams({ access_token: token });
  if (imageUrl) {
    params.set('url', imageUrl);
    params.set('caption', text);
  } else {
    params.set('message', text);
    params.set('link', item.link || '');
  }

  const res = await fetch(endpoint, { method: 'POST', body: params });
  if (!res.ok) throw new Error(`Facebook (${res.status}): ${await res.text()}`);
  const data = await res.json();
  if (data.error) throw new Error(`Facebook: ${JSON.stringify(data.error)}`);
  return { platform: 'facebook', postId: data.id };
};
