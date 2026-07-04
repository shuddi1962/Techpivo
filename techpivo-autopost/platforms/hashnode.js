import { buildUrl } from "../utils.js"

const GRAPHQL_URL = "https://gql.hashnode.com"

export async function post(article, env) {
  const token = env.HASHNODE_PAT
  if (!token) throw new Error("HASHNODE_PAT not set")

  const content = stripHtml(article.content || article.excerpt || article.title)
  const tags    = (article.tags || []).slice(0, 5).map(t => ({
    name: t,
    slug: t.toLowerCase().replace(/\s+/g, "-"),
  }))

  const query = `
    mutation PublishPost($input: PublishPostInput!) {
      publishPost(input: $input) {
        post {
          id
          url
        }
      }
    }
  `

  const variables = {
    input: {
      title: article.title,
      contentMarkdown: content,
      tags,
      originalArticleURL: buildUrl(article, "hashnode"),
    },
  }

  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Hashnode API (${res.status}): ${err}`)
  }

  const { data, errors } = await res.json()
  if (errors?.length) throw new Error(`Hashnode errors: ${errors.map(e => e.message).join(", ")}`)

  const postId = data?.publishPost?.post?.id || ""
  return { platform: "hashnode", postId }
}

function stripHtml(html) {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim()
}
