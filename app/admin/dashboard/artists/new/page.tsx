"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Music, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { AdminPageHeader } from "../../components/admin-page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

export default function NewArtistPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [genre, setGenre] = useState("")
  const [bio, setBio] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email are required")
      return
    }
    setSaving(true)
    try {
      const res = await fetch("/api/admin/artists", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, genre, bio }),
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success("Artist profile created")
      router.push("/admin/dashboard/artists")
    } catch (err: any) {
      toast.error(err.message || "Failed to create artist")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <AdminPageHeader
        title="Add Artist"
        subtitle="Create a new artist profile in your network"
        icon={Music}
        actions={
          <Button variant="outline" size="sm" className="border-slate-700 text-slate-300" asChild>
            <Link href="/admin/dashboard/artists">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <Card className="bg-slate-900/60 border-slate-700/50 backdrop-blur-sm rounded-sm">
        <CardHeader>
          <CardTitle className="text-white text-base">Artist Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-slate-300">Artist / Stage Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. The Black Keys"
                className="bg-slate-800/50 border-slate-700/50 text-white"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300">Email *</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="artist@example.com"
                className="bg-slate-800/50 border-slate-700/50 text-white"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300">Primary Genre</Label>
              <Input
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="e.g. Rock, Electronic, Hip-Hop"
                className="bg-slate-800/50 border-slate-700/50 text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300">Bio</Label>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Short artist bio..."
                className="bg-slate-800/50 border-slate-700/50 text-white min-h-[80px]"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                disabled={saving}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white border-0"
              >
                {saving ? "Creating..." : "Create Artist"}
              </Button>
              <Button type="button" variant="outline" className="border-slate-700 text-slate-300" asChild>
                <Link href="/admin/dashboard/artists">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
