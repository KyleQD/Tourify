import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar'
import { formatDistanceToNow } from 'date-fns'

interface Post {
  id: string
  user_id: string
  content: string
  created_at: string
  user: {
    name: string
    avatar_url: string
  }
}

export default async function FeedPage() {
  const supabase = await createClient()
  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, user_id, content, created_at, user:user_id(name, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return notFound()

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6">
      <h1 className="text-2xl font-bold mb-4">User Feed</h1>
      {posts?.length === 0 && <div className="text-slate-400">No posts yet.</div>}
      {posts?.map(post => (
        <Card key={post.id}>
          <CardHeader className="flex flex-row items-center gap-3">
            <Avatar>
              <AvatarImage src={post.user[0]?.avatar_url} alt={post.user[0]?.name} />
              <AvatarFallback>{post.user[0]?.name?.[0]}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-base">{post.user[0]?.name}</CardTitle>
              <div className="text-xs text-slate-400">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="mb-2 whitespace-pre-line">{post.content}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost">Like</Button>
              <Button size="sm" variant="ghost">Comment</Button>
              <Button size="sm" variant="destructive">Delete</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
} 