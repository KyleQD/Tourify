import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(url, key)

const { data, error } = await supabase.from('posts').select('*').limit(1)
if (error) {
  console.log('ERROR', error.message)
} else {
  console.log('COLUMNS', Object.keys(data?.[0] || {}).join(', '))
}
