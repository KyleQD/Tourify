const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  const { data: posts, error: postsErr } = await supabase
    .from('artist_blog_posts')
    .select('id, title, slug, status, format, featured_image_url, categories, posted_as_type, account_display_name, published_at')
    .order('created_at', { ascending: false })
    .limit(10)
  console.log('blog posts err:', postsErr?.message || null)
  console.log(JSON.stringify(posts, null, 2))

  const { data: buckets, error: bErr } = await supabase.storage.listBuckets()
  console.log('buckets err:', bErr?.message || null)
  console.log('buckets:', (buckets || []).map(b => `${b.name} (public:${b.public})`).join(', '))

  const { data: tourifyProfiles } = await supabase
    .from('profiles')
    .select('id, username, full_name')
    .or('username.ilike.%tourify%,full_name.ilike.%tourify%')
    .limit(5)
  console.log('tourify profiles:', JSON.stringify(tourifyProfiles))

  const { data: anyProfiles } = await supabase
    .from('profiles')
    .select('id, username, full_name')
    .limit(5)
  console.log('sample profiles:', JSON.stringify(anyProfiles))
}

main().catch(e => { console.error(e); process.exit(1) })
