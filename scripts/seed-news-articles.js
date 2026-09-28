const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const SEED_DIR = path.join(__dirname, '..', 'seed_articles')
const BUCKET = 'posts'

async function main() {
  const articles = JSON.parse(fs.readFileSync(path.join(SEED_DIR, 'articles.seed.json'), 'utf8'))

  // Owner account to attach rows to (display name is overridden to "Tourify")
  const { data: owner, error: ownerErr } = await supabase
    .from('profiles')
    .select('id, username, full_name')
    .eq('full_name', 'Kyle Daley')
    .limit(1)
    .maybeSingle()
  if (ownerErr || !owner) throw new Error(`Owner profile not found: ${ownerErr?.message}`)
  console.log(`Using owner account: ${owner.full_name} (@${owner.username}) ${owner.id}`)

  const now = Date.now()
  const DAY = 24 * 60 * 60 * 1000

  for (let i = 0; i < articles.length; i++) {
    const a = articles[i]
    console.log(`\n→ ${a.slug}`)

    // Upload hero image
    const imgPath = path.join(SEED_DIR, a.hero_image)
    const imgBuffer = fs.readFileSync(imgPath)
    const storagePath = `news/${path.basename(a.hero_image)}`
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, imgBuffer, { contentType: 'image/jpeg', upsert: true })
    if (upErr) throw new Error(`Image upload failed for ${a.slug}: ${upErr.message}`)
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
    const imageUrl = pub.publicUrl
    console.log(`  image: ${imageUrl}`)

    // Append photo credit + sources to the body
    const sourcesMd = (a.sources || [])
      .map(s => `- [${s.title}](${s.url})`)
      .join('\n')
    const body =
      a.body_markdown.trim() +
      `\n\n## Sources and further reading\n\n${sourcesMd}\n\n---\n\n*${a.photo_credit.label} (${a.photo_credit.license}) — ${a.photo_credit.url}*`

    const publishedAt = new Date(now - i * DAY).toISOString()

    const row = {
      title: a.title,
      slug: a.slug,
      content: body,
      excerpt: a.excerpt,
      featured_image_url: imageUrl,
      status: 'published',
      format: 'article',
      published_at: publishedAt,
      tags: ['Tourify', 'Platform'],
      categories: [a.category, 'Articles'],
      user_id: owner.id,
      posted_as_profile_id: owner.id,
      posted_as_type: 'general',
      account_display_name: 'Tourify',
      account_username: 'tourify',
      account_is_verified: true,
      seo_title: a.title,
      seo_description: a.excerpt
    }

    const { data, error } = await supabase
      .from('artist_blog_posts')
      .upsert(row, { onConflict: 'slug' })
      .select('id, slug, status, published_at')
    if (error) throw new Error(`Insert failed for ${a.slug}: ${error.message}`)
    console.log(`  saved:`, JSON.stringify(data[0]))
  }

  console.log('\n✅ Done — 5 articles seeded as published.')
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
