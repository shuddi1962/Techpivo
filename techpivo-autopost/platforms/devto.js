const API = 'https://dev.to/api';

exports.post = async function post(item, imageUrl, caption) {
  const apiKey = process.env.DEVTO_API_KEY;
  if (!apiKey) throw new Error('DEVTO_API_KEY not set');

  const content = stripHtml(item.content || item.contentSnippet || item.title || '');
  const tags = (item.categories || []).slice(0, 4).map(t => t.toLowerCase().replace(/\s+/g, ''));

  const body = {
    article: {
      title: item.title || '',
      body_markdown: content,
      published: true,
      tags,
      canonical_url: item.link || '',
    },
  };
  const res = await fetch(`${API}/articles`, {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Dev.to (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return { platform: 'devto', postId: String(data?.id || '') };
};

function stripHtml(s) {
  return String(s).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'").trim();
}
