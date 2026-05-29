import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://xkhvojjogoeuvrifekwr.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhraHZvampvZ29ldXZyaWZla3dyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU1MjYzMywiZXhwIjoyMDk1MTI4NjMzfQ.06p7J_Gr9CW3nyGc1f0HGj8hXad5U8nJ9yt9XKC9aa8'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

const brokenImages = [
  { id: 'db0d1769-1041-4db1-8e62-dd0d0ec6d2e5', title: 'iOS 27 Liquid Glass', url: 'https://9to5mac.com/wp-content/uploads/sites/6/2025/11/ios-26-2-liquid-glass-clock-lock-screen.jpg?quality=82&strip=all&w=1600' },
  { id: '8214d978-cf39-413c-9e76-917ed7e3b840', title: 'GitHub ESC Collection', url: 'https://github.blog/wp-content/uploads/2026/05/Blog_Image_02.png?resize=1024%2C576' },
  { id: 'b5a88821-8122-4926-b245-f767c8b972e0', title: 'VS Code Git', url: 'https://github.blog/wp-content/uploads/2026/05/GIT901_THUMB_GFB_A-1.png?fit=1280%2C720' },
]

for (const img of brokenImages) {
  console.log(`\n${img.title}`)
  try {
    const res = await fetch(img.url, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(20000),
    })
    if (!res.ok) { console.log(`  HTTP ${res.status}`); continue }
    const buf = Buffer.from(await res.arrayBuffer())
    const ext = img.url.includes('.png') ? '.png' : '.jpg'
    const filename = `post-${img.id}${ext}`

    const { error: upErr } = await supabase.storage
      .from('post-images')
      .upload(filename, buf, { contentType: res.headers.get('content-type') || 'image/jpeg', upsert: true })
    if (upErr) { console.log(`  Upload fail: ${upErr.message}`); continue }

    const { data: pub } = supabase.storage.from('post-images').getPublicUrl(filename)
    await supabase.from('posts').update({ featured_image: pub.publicUrl }).eq('id', img.id)
    console.log(`  FIXED -> ${pub.publicUrl}`)
  } catch (e) {
    console.log(`  Error: ${e.message}`)
    // Try category fallback
    const { data: post } = await supabase.from('posts').select('category_id').eq('id', img.id).single()
    const { data: cat } = await supabase.from('categories').select('slug').eq('id', post?.category_id).single()
    const fallbacks = {
      'tech-news': 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80',
      'gadgets': 'https://images.unsplash.com/photo-1491933382434-500287f9b54b?w=1200&q=80',
      'programming': 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&q=80',
      'reviews': 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1200&q=80',
    }
    const fallback = fallbacks[cat?.slug] || fallbacks['tech-news']
    // Download fallback and upload
    try {
      const fb = await fetch(fallback, { signal: AbortSignal.timeout(10000) })
      const buf = Buffer.from(await fb.arrayBuffer())
      const filename = `post-${img.id}.jpg`
      await supabase.storage.from('post-images').upload(filename, buf, { contentType: 'image/jpeg', upsert: true })
      const { data: pub } = supabase.storage.from('post-images').getPublicUrl(filename)
      await supabase.from('posts').update({ featured_image: pub.publicUrl }).eq('id', img.id)
      console.log(`  FIXED (fallback) -> ${pub.publicUrl}`)
    } catch (e2) {
      console.log(`  Fallback also failed: ${e2.message}`)
    }
  }
}
