import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { topic, category, keywords } = body;

  // Generate a content brief
  const brief = {
    topic,
    category: category || 'Technology',
    title: `${topic} — Complete Guide`,
    slug: topic.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    meta_description: `Learn about ${topic}. This comprehensive guide covers everything you need to know.`,
    outline: [
      { heading: `What is ${topic}?`, level: 2 },
      { heading: 'Key Features', level: 2 },
      { heading: 'How It Works', level: 2 },
      { heading: 'Benefits', level: 2 },
      { heading: 'Getting Started', level: 2 },
      { heading: 'Best Practices', level: 2 },
      { heading: 'FAQ', level: 2 },
    ],
    keywords: keywords || [topic],
    target_audience: 'Technology enthusiasts and professionals',
    estimated_reading_time: '8-12 minutes',
    content_type: 'tutorial',
  };

  // Save brief to content_briefs table
  const { data, error } = await supabase
    .from('content_briefs')
    .insert({
      topic,
      category: category || 'Technology',
      opportunity_score: 75,
      brief_data: brief,
      status: 'generated',
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ brief });
  }

  return NextResponse.json({ brief: { ...brief, id: data.id } });
}
