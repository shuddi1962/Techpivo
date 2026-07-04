exports.post = async function post(item, imageUrl, caption) {
  const token  = process.env.LINKEDIN_ACCESS_TOKEN;
  const orgUrn = process.env.LINKEDIN_ORG_URN;
  if (!token || !orgUrn) throw new Error('LINKEDIN_ACCESS_TOKEN / LINKEDIN_ORG_URN not set');

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Restli-Protocol-Version': '2.0.0',
  };

  const template = process.env.LINKEDIN_TEMPLATE || '{title}\n\nRead more: {url}';
  const text = template
    .replace(/\{title\}/g,   item.title || '')
    .replace(/\{url\}/g,     item.link || '')
    .replace(/\{caption\}/g, caption)
    .replace(/\{excerpt\}/g, (item.contentSnippet || item.content || '').slice(0, 200));

  let assetUrn = null;

  if (imageUrl) {
    // Step 1 — register the upload
    const registerRes = await fetch(
      'https://api.linkedin.com/v2/assets?action=registerUpload',
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          registerUploadRequest: {
            recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
            owner: orgUrn,
            serviceRelationships: [
              { relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' },
            ],
          },
        }),
      }
    );
    const registerData = await registerRes.json();
    if (registerData.serviceErrorCode) {
      throw new Error(`LinkedIn register upload: ${JSON.stringify(registerData)}`);
    }
    const uploadUrl =
      registerData.value.uploadMechanism[
        'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
      ].uploadUrl;
    assetUrn = registerData.value.asset;

    // Step 2 — PUT the image bytes
    const imgRes = await fetch(imageUrl);
    const imgBuf = Buffer.from(await imgRes.arrayBuffer());
    const putRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: imgBuf,
    });
    if (!putRes.ok) throw new Error(`LinkedIn image upload failed: ${putRes.status}`);
  }

  // Step 3 — create the post
  const postBody = {
    author: orgUrn,
    lifecycleState: 'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary: { text },
        shareMediaCategory: assetUrn ? 'IMAGE' : 'NONE',
        ...(assetUrn && {
          media: [{ status: 'READY', media: assetUrn }],
        }),
      },
    },
    visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
  };

  const postRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers,
    body: JSON.stringify(postBody),
  });
  if (!postRes.ok) throw new Error(`LinkedIn post failed: ${await postRes.text()}`);
  const data = await postRes.json();
  return { platform: 'linkedin', postId: data.id };
};
