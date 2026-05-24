import pg from 'pg'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sqlPath = resolve(__dirname, '..', 'supabase', 'migrations', '004_add_quick_brief.sql')
const sql = readFileSync(sqlPath, 'utf-8')

const pool = new pg.Pool({
  connectionString: 'postgresql://postgres:Blizine@2024!@db.xkhvojjogoeuvrifekwr.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000,
})

try {
  const client = await pool.connect()
  await client.query(sql)
  console.log('Migration applied successfully')
  client.release()
} catch (err) {
  console.error('Migration failed:', err.message)
} finally {
  await pool.end()
}
