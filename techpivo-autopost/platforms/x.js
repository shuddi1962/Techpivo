const { TwitterApi } = require('twitter-api-v2');

function getClient() {
  return new TwitterApi({
    appKey: process.env.X_APP_KEY,
    appSecret: process.env.X_APP_SECRET,
    accessToken: process.env.X_ACCESS_TOKEN,
    accessSecret: process.env.X_ACCESS_SECRET,
  });
}

function buildText(item, caption) {
  const template = process.env.X_TEMPLATE || '{title}\n\n{url}';
  let text = template
    .replace(/\{title\}/g,   item.title || '')
    .replace(/\{url\}/g,     item.link || '')
    .replace(/\{caption\}/g, caption);
  const maxLen = 260;
  if (text.length <= maxLen) return text;
  const link = item.link || '';
  const available = maxLen - link.length - 4;
  const title = (item.title || '').slice(0, available).trim();
  return `${title}... ${link}`;
}

exports.post = async function post(item, imageUrl, caption) {
  const client = getClient();
  const text = buildText(item, caption);

  let mediaIds = [];
  if (imageUrl) {
    const imgRes = await fetch(imageUrl);
    const imgBuf = Buffer.from(await imgRes.arrayBuffer());
    const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
    const mediaId = await client.v1.uploadMedia(imgBuf, { mimeType: contentType });
    mediaIds = [mediaId];
  }

  const tweet = await client.v2.tweet({
    text,
    ...(mediaIds.length && { media: { media_ids: mediaIds } }),
  });
  return { platform: 'x', postId: tweet?.data?.id };
};
