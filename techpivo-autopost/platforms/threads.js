const GRAPH_VERSION = process.env.GRAPH_API_VERSION || 'v1.0';
const API = `https://graph.threads.net/${GRAPH_VERSION}`;

exports.post = async function post(item, imageUrl, caption) {
  const userId = process.env.THREADS_USER_ID;
  const token  = process.env.THREADS_ACCESS_TOKEN;
  if (!userId || !token) throw new Error('THREADS_USER_ID / THREADS_ACCESS_TOKEN not set');

  const template = process.env.THREADS_TEMPLATE || '{title}\n\nRead more: {url}';
  const text = template
    .replace(/\{title\}/g,   item.title || '')
    .replace(/\{url\}/g,     item.link || '')
    .replace(/\{caption\}/g, caption)
    .replace(/\{excerpt\}/g, (item.contentSnippet || item.content || '').slice(0, 150));

  // Step 1 — create container
  const createBody = new URLSearchParams({
    media_type: imageUrl ? 'IMAGE' : 'TEXT',
    text,
    access_token: token,
  });
  if (imageUrl) createBody.set('image_url', imageUrl);

  const createRes = await fetch(`${API}/${userId}/threads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: createBody,
  });
  if (!createRes.ok) throw new Error(`Threads create (${createRes.status}): ${await createRes.text()}`);
  const { id: creationId } = await createRes.json();

  // Step 2 — publish
  const publishBody = new URLSearchParams({ creation_id: creationId, access_token: token });
  const publishRes = await fetch(`${API}/${userId}/threads_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: publishBody,
  });
  if (!publishRes.ok) throw new Error(`Threads publish (${publishRes.status}): ${await publishRes.text()}`);
  const data = await publishRes.json();
  return { platform: 'threads', postId: data.id };
};
