import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://xkhvojjogoeuvrifekwr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhraHZvampvZ29ldXZyaWZla3dyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU1MjYzMywiZXhwIjoyMDk1MTI4NjMzfQ.06p7J_Gr9CW3nyGc1f0HGj8hXad5U8nJ9yt9XKC9aa8'
)

const { data, error } = await supabase
  .from('posts')
  .update({ ai_rewritten: true, quick_brief: [] })
  .eq('quick_brief', '[]')
  .select('id')

if (error) {
  console.error('Error:', error.message)
} else {
  console.log('Reset', data?.length, 'posts')
}
