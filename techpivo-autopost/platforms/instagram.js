const API = 'https://graph.facebook.com/v21.0';

exports.post = async function post(item, imageUrl, caption) {
  const igUserId = process.env.IG_USER_ID;
  const token    = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!igUserId || !token) throw new Error('IG_USER_ID / FB_PAGE_ACCESS_TOKEN not set');
  if (!imageUrl) throw new Error('Instagram requires an image');

  const template = process.env.INSTAGRAM_TEMPLATE || '{title}\n\nRead more: Link in bio';
  const cap = template
    .replace(/\{title\}/g,   item.title || '')
    .replace(/\{url\}/g,     item.link || '')
    .replace(/\{caption\}/g, caption)
    .replace(/\{excerpt\}/g, (item.contentSnippet || item.content || '').slice(0, 150));

  // Step 1 — create media container
  const createBody = new URLSearchParams({ image_url: imageUrl, caption: cap, access_token: token });
  const createRes = await fetch(`${API}/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: createBody,
  });
  if (!createRes.ok) throw new Error(`Instagram create (${createRes.status}): ${await createRes.text()}`);
  const { id: creationId } = await createRes.json();

  // Step 2 — publish
  const publishBody = new URLSearchParams({ creation_id: creationId, access_token: token });
  const publishRes = await fetch(`${API}/${igUserId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: publishBody,
  });
  if (!publishRes.ok) throw new Error(`Instagram publish (${publishRes.status}): ${await publishRes.text()}`);
  const data = await publishRes.json();
  return { platform: 'instagram', postId: data.id };
};
