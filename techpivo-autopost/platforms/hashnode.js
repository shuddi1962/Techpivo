const API = 'https://gql.hashnode.com';

exports.post = async function post(item, imageUrl, caption) {
  const token = process.env.HASHNODE_PAT;
  if (!token) throw new Error('HASHNODE_PAT not set');

  const content = stripHtml(item.content || item.contentSnippet || item.title || '');
  const tags = (item.categories || []).slice(0, 5).map(t => ({ name: t, slug: t.toLowerCase().replace(/\s+/g, '-') }));

  const query = `mutation PublishPost($input: PublishPostInput!) {
    publishPost(input: $input) { post { id url } }
  }`;
  const variables = {
    input: {
      title: item.title || '',
      contentMarkdown: content,
      tags,
      originalArticleURL: item.link || '',
    },
  };

  const res = await fetch(API, {
    method: 'POST',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Hashnode (${res.status}): ${await res.text()}`);
  const { data, errors } = await res.json();
  if (errors?.length) throw new Error(`Hashnode: ${errors.map(e => e.message).join(', ')}`);
  return { platform: 'hashnode', postId: data?.publishPost?.post?.id || '' };
};

function stripHtml(s) {
  return String(s).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'").trim();
}
