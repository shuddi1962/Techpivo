import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const BOT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; Techpivo/1.0; +https://www.techpivo.com/bot)',
  'Accept': 'text/html,application/xhtml+xml,*/*'
}

function extractImageFromItem(item: Record<string, any>): string | null {
  const mediaContent = item['media:content']
  if (mediaContent?.['$']?.url) return mediaContent['$'].url
  if (Array.isArray(mediaContent) && mediaContent[0]?.['$']?.url) return mediaContent[0]['$'].url

  const mediaThumbnail = item['media:thumbnail']
  if (mediaThumbnail?.['$']?.url) return mediaThumbnail['$'].url
  if (Array.isArray(mediaThumbnail) && mediaThumbnail[0]?.['$']?.url) return mediaThumbnail[0]['$'].url

  const enclosure = item['enclosure']
  const encUrl = enclosure?.['$']?.url || (enclosure as any)?.url
  if (encUrl && /\.(jpg|jpeg|png|webp|gif)/i.test(encUrl)) return encUrl

  const encoded = (item['content:encoded'] || item['content'] || '') as string
  if (encoded) {
    const imgMatch = encoded.match(/<img[^>]+src=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp|gif)[^"']*)["']/i)
    if (imgMatch?.[1]) return imgMatch[1]
  }

  const desc = (item['description'] || '') as string
  if (desc) {
    const imgMatch = desc.match(/<img[^>]+src=["'](https?:\/\/[^"']+\.(?:jpg|jpeg|png|webp)[^"']*)["']/i)
    if (imgMatch?.[1]) return imgMatch[1]
  }

  return null
}

async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: BOT_HEADERS,
      signal: AbortSignal.timeout(8000)
    })
    const html = await res.text()
    const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
    return match?.[1] ? sanitizeImageUrl(match[1]) : null
  } catch {
    return null
  }
}

async function fetchArticleText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: BOT_HEADERS,
      signal: AbortSignal.timeout(5000)
    })
    const html = await res.text()
    const patterns = [
      /<article[^>]*>([\s\S]*?)<\/article>/i,
      /<div[^>]+class=["'][^"']*(?:article-body|post-content|entry-content|story-body|article__body)[^"']*["'][^>]*>([\s\S]{500,}?)<\/div>/i,
      /<main[^>]*>([\s\S]*?)<\/main>/i,
    ]
    for (const p of patterns) {
      const m = html.match(p)
      if (m?.[1]) {
        const text = m[1]
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ').trim()
        if (text.length > 300) return text.slice(0, 2000)
      }
    }
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1000)
  } catch {
    return ''
  }
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

function stripInvisibleChars(text: string): string {
  return text.replace(/[\u200b-\u200f\u2060-\u2064\ufeff\u00ad\u034f\u061c\u115f\u1160\u17b4\u17b5\u180e\u2000-\u200a\u2028-\u202f\u205f\u2066-\u2069\ufff9-\ufffb\u206a-\u206f\u0080-\u009f\u00a0]/g, ' ').replace(/\s+/g, ' ').trim()
}

function sanitizeImageUrl(url: string): string {
  return url
    .replace(/&amp;/g, '&').replace(/&#038;/g, '&').replace(/&#x26;/gi, '&')
    .replace(/^http:\/\//i, 'https://')
}

function parseRSSItems(xml: string): Array<Record<string, any>> {
  const items: Array<Record<string, any>> = []
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g)

  for (const match of itemMatches) {
    const xml = match[1]
    const get = (tag: string) =>
      xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\/${tag}>`, 'i'))?.[1]?.trim()
      || xml.match(new RegExp(`<${tag}[^>]*>([^<]*)<\/${tag}>`, 'i'))?.[1]?.trim()
      || ''

    const item: Record<string, any> = {
      title: decodeHtmlEntities(get('title')),
      link: get('link') || get('guid'),
      pubDate: get('pubDate') || get('published') || get('dc:date') || '',
      description: get('description').replace(/<[^>]+>/g, '').trim().slice(0, 300),
      'content:encoded': get('content:encoded') || get('content'),
      'dc:creator': get('dc:creator') || get('author') || '',
    }

    const mediaContent = xml.match(/<media:content[^>]+url=["']([^"']+)["'][^>]*\/?>/i)
    if (mediaContent) {
      item['media:content'] = { '$': { url: mediaContent[1] } }
    }

    const mediaThumbnail = xml.match(/<media:thumbnail[^>]+url=["']([^"']+)["'][^>]*\/?>/i)
    if (mediaThumbnail) {
      item['media:thumbnail'] = { '$': { url: mediaThumbnail[1] } }
    }

    const enclosure = xml.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]*\/?>/i)
    if (enclosure) {
      item['enclosure'] = { '$': { url: enclosure[1] } }
    }

    if (item.title && item.link) items.push(item)
  }

  return items
}

function makeSlug(title: string): string {
  return title.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) + '-' + Date.now().toString(36)
}

const SUBCATEGORY_RULES: Array<{words: string[]; catSlug: string; subSlug: string}> = [
  { words: ['chatgpt','gpt-','claude','gemini','copilot','llama','mistral','llm ','large language model'], catSlug: 'ai-automation', subSlug: 'llms' },
  { words: ['machine learning','deep learning','neural network','training data','model training','supervised','reinforcement'], catSlug: 'ai-automation', subSlug: 'machine-learning' },
  { words: ['hack','vulnerability','cve','exploit','penetration','red team','bug bounty'], catSlug: 'cybersecurity', subSlug: 'ethical-hacking' },
  { words: ['privacy','gdpr','data protection','surveillance','encryption','tracking'], catSlug: 'cybersecurity', subSlug: 'privacy' },
  { words: ['javascript','node.js','npm ','react ','vue ','angular','typescript'], catSlug: 'programming', subSlug: 'javascript' },
  { words: ['python','django','flask','pandas','numpy','pytorch','tensorflow'], catSlug: 'programming', subSlug: 'python' },
  { words: ['typescript','ts ','tsx'], catSlug: 'programming', subSlug: 'typescript' },
  { words: ['css ','html ','sass','less','tailwind','design system','responsive','ui '], catSlug: 'web-development', subSlug: 'css-design' },
  { words: ['react','vue','angular','svelte','htmx','frontend','next.js'], catSlug: 'web-development', subSlug: 'frontend' },
  { words: ['backend','api ','rest','graphql','database','sql ','server'], catSlug: 'web-development', subSlug: 'backend' },
]

function autoSubcategory(title: string, categoryId: string, categories: Array<{id:string;slug:string}>, subcategories: Array<{id:string;slug:string;catSlug:string}>): string | null {
  const t = title.toLowerCase()
  const cat = categories.find(c => c.id === categoryId)
  if (!cat) return null
  for (const r of SUBCATEGORY_RULES) {
    if (r.catSlug === cat.slug && r.words.some(w => t.includes(w))) {
      const sub = subcategories.find(s => s.slug === r.subSlug)
      if (sub) return sub.id
    }
  }
  return null
}

function autoCategory(title: string, feedCategoryId: string, categories: Array<{id:string;slug:string}>): string {
  const t = title.toLowerCase()
  const rules: Array<{words: string[]; slug: string}> = [
    { words: ['hack','vulnerability','breach','malware','ransomware','cve','exploit','phishing','zero-day','cyber'], slug: 'cybersecurity' },
    { words: [' ai ','artificial intelligence','machine learning','chatgpt','gemini','openai','gpt-','llm ','deep learning','copilot','claude'], slug: 'ai-automation' },
    { words: ['iphone','android','smartphone','macbook','galaxy','pixel ','tablet','wearable','headphone','airpods','smartwatch','drone','camera lens','console','playstation','xbox','nintendo switch'], slug: 'gadgets' },
    { words: ['javascript','python','rust ','golang','typescript','react ','node.js','vue ','angular','django','flask','api ','sdk ','open source','github','npm '], slug: 'programming' },
    { words: ['css ','html ','frontend','next.js','tailwind','wordpress','web design','web app','svelte','htmx'], slug: 'web-development' },
    { words: ['startup','funding','raises','series a','series b','ipo','acquisition','unicorn','venture capital','revenue','valuation','ceo appointed'], slug: 'digital-business' },
    { words: ['how to','tutorial','guide','step by step','beginners','getting started','walkthrough','tips for','learn '], slug: 'tutorials' },
    { words: ['review:','reviewed:','best laptops','best phones','buying guide','vs ','compared','rated','tested','ranked'], slug: 'reviews' },
    { words: ['cloud ','kubernetes','docker','devops','aws ','azure ','gcp ','server ','network ','vpn ','infrastructure'], slug: 'networking-it' },
  ]
  for (const r of rules) {
    if (r.words.some(w => t.includes(w))) {
      const cat = categories.find(c => c.slug === r.slug)
      if (cat) return cat.id
    }
  }
  return feedCategoryId
}

const CATEGORY_SEARCH: Record<string, string> = {
  'ai-automation':   'artificial intelligence technology',
  'cybersecurity':   'cybersecurity data protection',
  'gadgets':         'modern technology gadget',
  'programming':     'computer programming code',
  'web-development': 'web development design',
  'tutorials':       'learning education technology',
  'digital-business':'business technology startup',
  'networking-it':   'server network technology',
  'reviews':         'product review technology',
  'tech-news':       'technology innovation',
}

const CATEGORY_FALLBACKS: Record<string, string> = {
  'tech-news':       'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80',
  'ai-automation':   'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&q=80',
  'cybersecurity':   'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&q=80',
  'gadgets':         'https://images.unsplash.com/photo-1491933382434-500287f9b54b?w=1200&q=80',
  'programming':     'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&q=80',
  'web-development': 'https://images.unsplash.com/photo-1547658719-da2b51169166?w=1200&q=80',
  'tutorials':       'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&q=80',
  'digital-business':'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80',
  'networking-it':   'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&q=80',
  'reviews':         'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1200&q=80',
}

async function pexelsSearch(query: string): Promise<string | null> {
  const key = Deno.env.get('PEXELS_API_KEY')
  if (!key) return null
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape`,
      { headers: { 'Authorization': key }, signal: AbortSignal.timeout(5000) }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.photos?.[0]?.src?.large2x || null
  } catch {
    return null
  }
}

async function processFeed(feed: any, categories: Array<{id:string;slug:string}>, subcategories: Array<{id:string;slug:string;catSlug:string}>, authorId: string, maxPerFeed: number): Promise<{new: number; errors: string[]}> {
  let newCount = 0
  const errs: string[] = []
  try {
    const res = await fetch(feed.feed_url, {
      headers: { ...BOT_HEADERS, 'Accept': 'application/rss+xml,application/xml,text/xml,*/*' },
      signal: AbortSignal.timeout(10000)
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const xml = await res.text()
    const items = parseRSSItems(xml)

    for (const item of items.slice(0, maxPerFeed)) {
      if (newCount >= maxPerFeed) break
      try {
        const title = stripInvisibleChars((item.title as string)?.trim() || '')
        const link = (item.link as string)?.trim()
        if (!title || !link) continue

        const { data: exists } = await supabase
          .from('posts')
          .select('id')
          .or(`original_source_url.eq.${link},title.ilike.${title.slice(0, 80).replace(/[%_]/g, '\\$&')}%`)
          .limit(1)
        if (exists?.length) continue

        let image = extractImageFromItem(item)
        if (image) image = sanitizeImageUrl(image)
        if (!image) image = await fetchOgImage(link)
        if (!image || !image.startsWith('http')) {
          const catSlug = (feed.categories as {slug:string})?.slug || 'tech-news'
          const searchTerm = CATEGORY_SEARCH[catSlug] || 'technology'
          image = await pexelsSearch(searchTerm)
        }
        if (!image || !image.startsWith('http')) {
          const catSlug = (feed.categories as {slug:string})?.slug || 'tech-news'
          image = CATEGORY_FALLBACKS[catSlug] || CATEGORY_FALLBACKS['tech-news']
        }

        const articleText = await fetchArticleText(link)
        const categoryId = autoCategory(title, feed.category_id, categories)
        const subcategoryId = autoSubcategory(title, categoryId, categories, subcategories)

        const { data: post, error } = await supabase
          .from('posts')
          .insert({
            title,
            slug: makeSlug(title),
            excerpt: (item.description as string) || title.slice(0, 200),
            content: articleText
              ? `<article>${articleText.slice(0, 2000).split('\n').filter(l => l.trim()).map(l => `<p>${l}</p>`).join('')}</article>`
              : `<article><p>${title}</p></article>`,
            featured_image: image ? sanitizeImageUrl(image) : image,
            category_id: categoryId,
            subcategory_id: subcategoryId,
            author_id: authorId,
            source_name: feed.feed_name,
            status: feed.auto_rewrite ? 'draft' : 'published',
            rss_source_url: feed.feed_url,
            original_source_url: link,
            ai_rewritten: false,
            published_at: (() => {
              const d = new Date(item.pubDate as string || Date.now())
              return d > new Date() ? new Date().toISOString() : d.toISOString()
            })(),
            reading_time: Math.max(1, Math.round((articleText.split(' ').length || 50) / 200)),
            views: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select('id')
          .single()

        if (error) { errs.push(error.message); continue }

        newCount++

        // Track in daily_article_count
        try { await supabase.rpc('increment_daily_count') } catch {}

        if (feed.auto_rewrite) {
          try {
            fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/rewrite-post`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                post_id: post.id,
                article_content: articleText,
                source_name: feed.feed_name
              })
            }).catch(() => {})
          } catch {}
        }
      } catch (e) {
        errs.push(`Item: ${e instanceof Error ? e.message : String(e)}`)
      }
    }

    if (newCount > 0) {
      const { data: current } = await supabase
        .from('rss_feeds')
        .select('posts_fetched')
        .eq('id', feed.id)
        .single()
      await supabase.from('rss_feeds')
        .update({
          last_fetched_at: new Date().toISOString(),
          posts_fetched: (current?.posts_fetched || 0) + newCount
        })
        .eq('id', feed.id)
    } else {
      await supabase.from('rss_feeds')
        .update({ last_fetched_at: new Date().toISOString() })
        .eq('id', feed.id)
    }

  } catch (e) {
    errs.push(`Feed ${feed.feed_name}: ${e instanceof Error ? e.message : String(e)}`)
  }
  return { new: newCount, errors: errs }
}

serve(async (req) => {
  let maxPosts = 10
  try {
    const body = await req.json().catch(() => ({}))
    if (body.max_posts && typeof body.max_posts === 'number') maxPosts = body.max_posts
  } catch {}

  // Check daily cap from site_settings
  const { data: capSetting } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'rss_daily_cap')
    .single()
  const dailyCap = capSetting?.value ?? maxPosts

  const { data: todayRow } = await supabase
    .from('daily_article_count')
    .select('count')
    .eq('date', new Date().toISOString().slice(0, 10))
    .single()
  const todayCount = todayRow?.count || 0

  if (todayCount >= dailyCap) {
    return new Response(JSON.stringify({
      new_posts: 0, cap_reached: true,
      message: `Daily cap of ${dailyCap} reached. Published today: ${todayCount}.`
    }), { headers: { 'Content-Type': 'application/json' } })
  }

  const remainingCap = dailyCap - todayCount
  const actualMax = Math.min(maxPosts, remainingCap)

  const { data: feeds } = await supabase
    .from('rss_feeds')
    .select('*, categories(slug)')
    .eq('is_active', true)

  const { data: categories } = await supabase
    .from('categories')
    .select('id, slug')

  const { data: catsWithSubs } = await supabase
    .from('categories')
    .select('slug, subcategories!inner(id, slug)')

  const subcatsWithCatSlug: Array<{id:string;slug:string;catSlug:string}> = []
  if (catsWithSubs) {
    for (const cat of catsWithSubs) {
      for (const sub of (cat as any).subcategories) {
        subcatsWithCatSlug.push({ id: sub.id, slug: sub.slug, catSlug: cat.slug })
      }
    }
  }

  if (!feeds?.length || !categories?.length) {
    return new Response(JSON.stringify({ error: 'No feeds or categories' }), { status: 500 })
  }

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id')
    .limit(1)

  const defaultAuthorId = profiles?.[0]?.id
  if (!defaultAuthorId) {
    return new Response(JSON.stringify({ error: 'No author profile found' }), { status: 500 })
  }

  let totalNew = 0
  const errors: string[] = []
  const CONCURRENCY = 5

  for (let i = 0; i < feeds.length && totalNew < actualMax; i += CONCURRENCY) {
    const batch = feeds.slice(i, i + CONCURRENCY)
    const remaining = actualMax - totalNew
    // Spread remaining across feeds in batch (at least 1 each)
    const perFeed = Math.max(1, Math.ceil(remaining / Math.max(1, feeds.length - i)))
    const results = await Promise.all(
      batch.map(f => processFeed(f, categories, subcatsWithCatSlug, defaultAuthorId, perFeed))
    )
    for (const r of results) {
      totalNew += r.new
      errors.push(...r.errors)
      if (totalNew >= actualMax) break
    }
  }

  return new Response(JSON.stringify({
    new_posts: totalNew, errors, max_posts: actualMax, cap_reached: totalNew >= actualMax,
    daily_remaining: dailyCap - todayCount - totalNew,
  }), {
    headers: { 'Content-Type': 'application/json' }
  })
})
