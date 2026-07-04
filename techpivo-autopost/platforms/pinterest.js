const API = 'https://api.pinterest.com/v5';

exports.post = async function post(item, imageUrl, caption) {
  const token = process.env.PINTEREST_ACCESS_TOKEN;
  if (!token) throw new Error('PINTEREST_ACCESS_TOKEN not set');
  if (!imageUrl) throw new Error('Pinterest requires an image');

  const boardId = process.env.PINTEREST_BOARD_ID;
  const description = process.env.PINTEREST_TEMPLATE
    ? process.env.PINTEREST_TEMPLATE
        .replace(/\{title\}/g,   item.title || '')
        .replace(/\{url\}/g,     item.link || '')
        .replace(/\{caption\}/g, caption)
    : caption;

  const body = {
    title: (item.title || '').slice(0, 100),
    description,
    link: item.link || '',
    alt_text: item.title ? `Read about ${item.title}` : '',
    image_source_url: imageUrl,
  };
  if (boardId) body.board_id = boardId;

  const res = await fetch(`${API}/pins`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Pinterest (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return { platform: 'pinterest', postId: data?.id || '' };
};
