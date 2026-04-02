"use client"

import {
  Globe,
  Instagram,
  Facebook,
  Twitter,
  Youtube,
  Apple,
  Music,
} from "lucide-react"

export function getSocialIcon(platform: string) {
  switch (platform.toLowerCase()) {
    case "instagram":
      return <Instagram className="h-5 w-5 shrink-0" />
    case "facebook":
      return <Facebook className="h-5 w-5 shrink-0" />
    case "twitter":
      return <Twitter className="h-5 w-5 shrink-0" />
    case "youtube":
      return <Youtube className="h-5 w-5 shrink-0" />
    case "spotify":
      return <Music className="h-5 w-5 shrink-0" />
    case "apple":
      return <Apple className="h-5 w-5 shrink-0" />
    default:
      return <Globe className="h-5 w-5 shrink-0" />
  }
}
