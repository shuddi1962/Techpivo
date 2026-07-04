const API = 'https://www.reddit.com/api/v1';

exports.post = async function post(item, imageUrl, caption) {
  const clientId     = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  const refreshToken = process.env.REDDIT_REFRESH_TOKEN;
  const subreddit    = process.env.REDDIT_SUBREDDIT || 'technology';
  if (!clientId || !clientSecret || !refreshToken) throw new Error('Reddit credentials not set');

  const tokenRes = await fetch(`${API}/access_token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'TechpivoAutopost/1.0',
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }).toString(),
  });
  if (!tokenRes.ok) throw new Error(`Reddit auth (${tokenRes.status}): ${await tokenRes.text()}`);
  const { access_token } = await tokenRes.json();
  if (!access_token) throw new Error('Reddit auth returned no access_token');

  const params = new URLSearchParams({
    api_type: 'json', kind: 'link', sr: subreddit,
    title: (item.title || '').slice(0, 300),
    url: item.link || '',
    resubmit: 'true',
  });
  const res = await fetch(`${API}/submit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${access_token}`, 'User-Agent': 'TechpivoAutopost/1.0', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (!res.ok) throw new Error(`Reddit submit (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return { platform: 'reddit', postId: data?.json?.data?.id || data?.json?.data?.name || '' };
};
