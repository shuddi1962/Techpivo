const GRAPH_VERSION = process.env.GRAPH_API_VERSION || 'v21.0';

exports.post = async function post(item, imageUrl, caption) {
  const igUserId = process.env.IG_USER_ID;
  const token    = process.env.FB_PAGE_ACCESS_TOKEN;
  if (!igUserId || !token) throw new Error('IG_USER_ID / FB_PAGE_ACCESS_TOKEN not set');
  if (!imageUrl) throw new Error('Instagram requires an image — skipping.');

  const template = process.env.INSTAGRAM_TEMPLATE || '{title}\n\nRead more: Link in bio';
  const cap = template
    .replace(/\{title\}/g,   item.title || '')
    .replace(/\{url\}/g,     item.link || '')
    .replace(/\{caption\}/g, caption);

  // Step 1 — create media container
  const createRes = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${igUserId}/media`,
    {
      method: 'POST',
      body: new URLSearchParams({ image_url: imageUrl, caption: cap, access_token: token }),
    }
  );
  const createData = await createRes.json();
  if (createData.error) throw new Error(`Instagram container: ${JSON.stringify(createData.error)}`);

  // Step 2 — publish
  const publishRes = await fetch(
    `https://graph.facebook.com/${GRAPH_VERSION}/${igUserId}/media_publish`,
    {
      method: 'POST',
      body: new URLSearchParams({ creation_id: createData.id, access_token: token }),
    }
  );
  const publishData = await publishRes.json();
  if (publishData.error) throw new Error(`Instagram publish: ${JSON.stringify(publishData.error)}`);
  return { platform: 'instagram', postId: publishData.id };
};
