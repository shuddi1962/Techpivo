const API = 'https://www.googleapis.com/youtube/v3';

exports.post = async function post(item, imageUrl, caption) {
  const token = process.env.YOUTUBE_ACCESS_TOKEN;
  if (!token) throw new Error('YOUTUBE_ACCESS_TOKEN not set (API key not sufficient for Community posts)');

  const channelId = process.env.YOUTUBE_CHANNEL_ID;
  if (!channelId) throw new Error('YOUTUBE_CHANNEL_ID not set');

  const template = process.env.YOUTUBE_TEMPLATE || '{title}\n\nRead more: {url}';
  const text = template
    .replace(/\{title\}/g,   item.title || '')
    .replace(/\{url\}/g,     item.link || '')
    .replace(/\{caption\}/g, caption)
    .replace(/\{excerpt\}/g, (item.contentSnippet || item.content || '').slice(0, 200));

  const body = { snippet: { channelId, text } };
  if (imageUrl) {
    body.contentDetails = { attachment: { image: { url: imageUrl } } };
  }

  const res = await fetch(`${API}/communityPosts?part=snippet,contentDetails`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`YouTube Community (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return { platform: 'youtube_community', postId: data?.id || '' };
};
