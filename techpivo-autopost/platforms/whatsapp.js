const API = 'https://graph.facebook.com/v21.0';

exports.post = async function post(item, imageUrl, caption) {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token   = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneId || !token) throw new Error('WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN not set');

  const template = process.env.WHATSAPP_TEMPLATE || '{title}\n\nRead more: {url}';
  const text = template
    .replace(/\{title\}/g,   item.title || '')
    .replace(/\{url\}/g,     item.link || '')
    .replace(/\{caption\}/g, caption)
    .replace(/\{excerpt\}/g, (item.contentSnippet || item.content || '').slice(0, 200));

  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'channel',
    type: 'text',
    text: { body: text },
  };
  const res = await fetch(`${API}/${phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`WhatsApp (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return { platform: 'whatsapp', postId: data?.messages?.[0]?.id || '' };
};
