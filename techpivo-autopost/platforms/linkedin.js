const API = 'https://api.linkedin.com/v2';

function utmUrl(link) {
  return `${link}${link.includes('?') ? '&' : '?'}utm_source=linkedin&utm_medium=social&utm_campaign=techpivo-auto`;
}

exports.post = async function post(item, imageUrl, caption) {
  const orgUrn = process.env.LINKEDIN_ORG_URN;
  const token  = process.env.LINKEDIN_ACCESS_TOKEN;
  if (!orgUrn || !token) throw new Error('LINKEDIN_ORG_URN / LINKEDIN_ACCESS_TOKEN not set');

  const author = `urn:li:organization:${orgUrn}`;
  const template = process.env.LINKEDIN_TEMPLATE || '{title}\n\nRead more: {url}';
  const text = template
    .replace(/\{title\}/g,   item.title || '')
    .replace(/\{url\}/g,     utmUrl(item.link))
    .replace(/\{caption\}/g, caption)
    .replace(/\{excerpt\}/g, (item.contentSnippet || item.content || '').slice(0, 200));

  const body = {
    author,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text },
        shareMediaCategory: 'NONE',
      },
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  };

  if (imageUrl) {
    try {
      const regRes = await fetch(`${API}/assets?action=registerUpload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0' },
        body: JSON.stringify({
          registerUploadRequest: {
            recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
            owner: author,
            serviceRelationships: [{ relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' }],
          },
        }),
      });
      if (regRes.ok) {
        const regData = await regRes.json();
        const uploadUrl = regData.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
        const assetUrn  = regData.value.asset;
        const imgRes = await fetch(imageUrl);
        if (imgRes.ok) {
          const imgBuf = await imgRes.arrayBuffer();
          await fetch(uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'image/jpeg' }, body: Buffer.from(imgBuf) });
          body.specificContent['com.linkedin.ugc.ShareContent'].media = [
            { status: 'READY', description: { text: item.title }, media: assetUrn, title: { text: item.title } },
          ];
          body.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'IMAGE';
        }
      }
    } catch { /* fall through without image */ }
  }

  const res = await fetch(`${API}/ugcPosts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Restli-Protocol-Version': '2.0.0' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`LinkedIn API (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return { platform: 'linkedin', postId: data.id };
};
