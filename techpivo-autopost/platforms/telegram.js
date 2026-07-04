const API = 'https://api.telegram.org';

exports.post = async function post(item, imageUrl, caption) {
  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) throw new Error('TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set');

  const template = process.env.TELEGRAM_TEMPLATE || '<b>{title}</b>\n\nRead more: {url}';
  const text = template
    .replace(/\{title\}/g,   escHtml(item.title || ''))
    .replace(/\{url\}/g,     item.link || '')
    .replace(/\{caption\}/g, escHtml(caption))
    .replace(/\{excerpt\}/g, escHtml((item.contentSnippet || item.content || '').slice(0, 200)));

  const body = { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: false };
  const res = await fetch(`${API}/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Telegram (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return { platform: 'telegram', postId: String(data.result?.message_id || '') };
};

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
