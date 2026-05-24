import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://xkhvojjogoeuvrifekwr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhraHZvampvZ29ldXZyaWZla3dyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTU1MjYzMywiZXhwIjoyMDk1MTI4NjMzfQ.06p7J_Gr9CW3nyGc1f0HGj8hXad5U8nJ9yt9XKC9aa8'
)

// Try to query quick_brief column to verify it exists
const { data, error } = await supabase
  .from('posts')
  .select('id, quick_brief, blizine_score')
  .limit(3)

if (error) {
  console.error('Column check failed:', error.message)
} else {
  console.log('Columns exist! Sample:', JSON.stringify(data, null, 2))
}
