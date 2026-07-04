const API = 'https://api.medium.com/v1';

exports.post = async function post(item, imageUrl, caption) {
  const token = process.env.MEDIUM_INTEGRATION_TOKEN;
  if (!token) throw new Error('MEDIUM_INTEGRATION_TOKEN not set');

  const meRes = await fetch(`${API}/me`, { headers: { Authorization: `Bearer ${token}` } });
  if (!meRes.ok) throw new Error(`Medium auth (${meRes.status}): ${await meRes.text()}`);
  const { data: user } = await meRes.json();
  if (!user?.id) throw new Error('Medium: could not get user ID');

  const content = item.content || item.contentSnippet || item.title || '';
  const tags = (item.categories || []).slice(0, 5);
  const canonicalUrl = item.link || '';

  const body = {
    title: item.title || '',
    contentFormat: 'html',
    content: `<p>${content}</p><p><a href="${canonicalUrl}">Read original article</a></p>`,
    canonicalUrl,
    tags,
    publishStatus: 'public',
  };
  const res = await fetch(`${API}/users/${user.id}/posts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Medium (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return { platform: 'medium', postId: data?.data?.id || '' };
};
