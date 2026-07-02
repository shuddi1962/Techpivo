import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { topic, category, outline, keywords } = body;

  // Generate article content
  const article = {
    title: body.title || `${topic} — Everything You Need to Know`,
    slug: (body.title || topic).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    content: generateArticleHTML(topic, outline),
    meta_description: `Discover everything about ${topic}. ${body.meta_description || 'A comprehensive guide covering features, benefits, and getting started.'}`,
    category: category || 'Technology',
    tags: keywords || [topic],
    schema_type: 'Article',
    estimated_reading_time: '10-15 minutes',
    status: 'draft',
  };

  // Save as a draft post
  const { data, error } = await supabase
    .from('posts')
    .insert({
      title: article.title,
      slug: article.slug,
      content: article.content,
      meta_description: article.meta_description,
      status: 'draft',
      author_id: user.id,
      content_ai_level: 'ai_generated',
      quick_brief: JSON.stringify({ topic, keywords, outline }),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ article, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ article: { ...article, id: data.id, post_id: data.id } });
}

function generateArticleHTML(topic: string, outline?: any[]): string {
  const sections = outline || [
    { heading: `What is ${topic}?`, level: 2 },
    { heading: 'Key Features', level: 2 },
    { heading: 'How It Works', level: 2 },
    { heading: 'Benefits', level: 2 },
    { heading: 'Getting Started', level: 2 },
  ];

  let html = `<p>${topic} is an important topic in technology today. In this comprehensive guide, we'll explore everything you need to know.</p>\n\n`;

  for (const section of sections) {
    html += `<h2>${section.heading}</h2>\n<p>This section covers the key aspects of ${section.heading.toLowerCase().replace(/[?!]/g, '')}.</p>\n\n`;
  }

  html += `<h2>Frequently Asked Questions</h2>\n<h3>What is ${topic}?</h3>\n<p>${topic} refers to a significant development in the technology landscape.</p>\n\n`;
  html += `<h3>Why is ${topic} important?</h3>\n<p>Understanding ${topic} is crucial for staying current with technology trends.</p>\n`;

  return html;
}
