"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Plus, Upload, Link, Music, Image as ImageIcon, Newspaper, Mail, Globe, Save, X, 
  Eye, Sparkles, Palette, Layout, Copy, ExternalLink, Download, Share2, 
  Camera, FileText, Calendar, Users, TrendingUp, Star, CheckCircle, Play, Loader2
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useEPKSync } from "@/hooks/use-epk-sync"
import { type EPKData } from "@/lib/services/epk.service"
import EPKPreview from "@/components/epk/epk-preview"
import { EpkBuilderView } from "@/components/epk/epk-builder-view"
import MusicSection from "@/components/epk/music-section"
import SocialSection from "@/components/epk/social-section"
import ShowsSection from "@/components/epk/shows-section"
import ContactSection from "@/components/epk/contact-section"
import { supabase } from "@/lib/supabase/client"
import { pdf } from "@react-pdf/renderer"
import { EPKDocument } from "@/components/epk/EPKDocument"

// EPKData interface is now imported from the service

/** Matches dashboard-style surfaces: full rounded corners + subtle border */
const epkSurface =
  "rounded-2xl border border-gray-800/80 bg-gradient-to-br from-[#191c24] to-[#23263a] shadow-lg shadow-black/20"
const epkInput =
  "rounded-xl border border-gray-700/50 bg-[#23263a] text-white placeholder:text-gray-500 focus-visible:ring-purple-500/40"

// Quick Action Sidebar Component
function QuickActions({ onPreview, onShare, onDownload }: { 
  onPreview: () => void
  onShare: () => void 
  onDownload: () => void
}) {
  return (
    <Card className={`${epkSurface} sticky top-4 border-white/10`}>
      <CardHeader className="space-y-1 p-4 pb-2">
        <CardTitle className="text-sm font-semibold tracking-tight text-white flex items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-purple-400" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 p-4 pt-0">
        <Button 
          onClick={onPreview}
          className="w-full rounded-xl bg-purple-600 text-white hover:bg-purple-700"
        >
          <Eye className="h-4 w-4 mr-2" />
          Live Preview
        </Button>
        <Button 
          onClick={onShare}
          variant="outline" 
          className="w-full rounded-xl border-gray-700/80 bg-transparent text-white hover:bg-white/5"
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share EPK
        </Button>
        <Button 
          onClick={onDownload}
          variant="outline" 
          className="w-full rounded-xl border-gray-700/80 bg-transparent text-white hover:bg-white/5"
        >
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </Button>
      </CardContent>
    </Card>
  )
}

// Enhanced Stats Overview Component
function StatsOverview({ stats, epkData, onImportFromProfile }: { 
  stats: EPKData['stats']
  epkData: EPKData
  onImportFromProfile: () => void | Promise<void>
}) {
  const totalSocialFollowers = epkData.social.reduce((total, link) => total + (link.followers || 0), 0)
  const totalShows = epkData.upcomingShows.length
  const totalStreams = epkData.music.reduce((total, track) => total + track.streams, 0)

  return (
    <Card className={`${epkSurface} border-white/10`}>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm font-semibold tracking-tight text-white flex items-center gap-2">
          <TrendingUp className="h-4 w-4 shrink-0 text-purple-400" />
          Performance Stats
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="grid grid-cols-2 gap-2">
          <div className="text-center rounded-xl border border-gray-800/60 bg-[#1a1d28]/80 px-2 py-2.5">
            <div className="text-lg font-bold tabular-nums text-white">
              {stats.monthlyListeners > 0 ? `${stats.monthlyListeners.toLocaleString()}K` : '0'}
            </div>
            <div className="text-[11px] leading-tight text-gray-400">Monthly Listeners</div>
          </div>
          <div className="text-center rounded-xl border border-gray-800/60 bg-[#1a1d28]/80 px-2 py-2.5">
            <div className="text-lg font-bold tabular-nums text-white">
              {totalSocialFollowers > 0 ? totalSocialFollowers.toLocaleString() : '0'}
            </div>
            <div className="text-[11px] leading-tight text-gray-400">Social Followers</div>
          </div>
          <div className="text-center rounded-xl border border-gray-800/60 bg-[#1a1d28]/80 px-2 py-2.5">
            <div className="text-lg font-bold tabular-nums text-white">
              {totalStreams > 0 ? `${Math.round(totalStreams / 1000)}K` : '0'}
            </div>
            <div className="text-[11px] leading-tight text-gray-400">Total Streams</div>
          </div>
          <div className="text-center rounded-xl border border-gray-800/60 bg-[#1a1d28]/80 px-2 py-2.5">
            <div className="text-lg font-bold tabular-nums text-white">{totalShows}</div>
            <div className="text-[11px] leading-tight text-gray-400">Total Shows</div>
          </div>
        </div>
        
        <Button 
          size="sm" 
          type="button"
          variant="outline"
          className="mt-3 w-full rounded-xl border-gray-700/80 bg-transparent text-xs text-white hover:bg-white/5"
          onClick={() => void onImportFromProfile()}
        >
          Import from Profile
        </Button>
      </CardContent>
    </Card>
  )
}

// Enhanced Template Selector Component with Visual Previews
function TemplateSelector({ selectedTemplate, onTemplateChange, epkData }: {
  selectedTemplate: string
  onTemplateChange: (template: string) => void
  epkData: EPKData
}) {
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewTemplate, setPreviewTemplate] = useState<string>('')

  const templates = [
    { 
      id: 'modern', 
      name: 'Modern', 
      description: 'Sleek gradients with premium aesthetics',
      colors: ['from-indigo-600', 'via-purple-600', 'to-pink-600'],
      textColor: 'text-white',
      accent: 'border-purple-400',
      style: 'premium-gradient'
    },
    { 
      id: 'black', 
      name: 'Black', 
      description: 'Pure black with neon accents',
      colors: ['from-black', 'via-gray-900', 'to-black'],
      textColor: 'text-white',
      accent: 'border-green-400',
      style: 'cyberpunk'
    },
    { 
      id: 'minimal', 
      name: 'Minimal', 
      description: 'Clean monochrome with subtle depth',
      colors: ['from-gray-50', 'via-white', 'to-gray-100'],
      textColor: 'text-gray-900',
      accent: 'border-gray-300',
      style: 'clean'
    },
    { 
      id: 'neon', 
      name: 'Neon', 
      description: 'Electric blue with vibrant highlights',
      colors: ['from-blue-900', 'via-cyan-800', 'to-teal-700'],
      textColor: 'text-white',
      accent: 'border-cyan-400',
      style: 'electric'
    },
    { 
      id: 'sunset', 
      name: 'Sunset', 
      description: 'Warm orange to pink transitions',
      colors: ['from-orange-500', 'via-pink-500', 'to-purple-600'],
      textColor: 'text-white',
      accent: 'border-orange-400',
      style: 'warm'
    }
  ]

  const handlePreviewClick = (templateId: string) => {
    setPreviewTemplate(templateId)
    setShowPreviewModal(true)
  }

  return (
    <>
      <Card className={`${epkSurface} border-white/10`}>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold tracking-tight text-white flex items-center gap-2">
            <Layout className="h-4 w-4 shrink-0 text-purple-400" />
            EPK Template
          </CardTitle>
          <CardDescription className="text-xs text-gray-400">
            Choose your EPK's visual style
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 p-4 pt-0">
          {templates.map((template) => (
            <div key={template.id} className="space-y-2">
              {/* Template Preview Card */}
              <div
                className={`relative cursor-pointer rounded-xl border-2 p-2.5 transition-all ${
                  selectedTemplate === template.id 
                    ? 'border-purple-500 bg-purple-500/10' 
                    : 'border-gray-800 hover:border-gray-600'
                }`}
                onClick={() => onTemplateChange(template.id)}
              >
                {/* Enhanced Mini EPK Preview */}
                <div className={`relative mb-2 h-20 overflow-hidden rounded-xl bg-gradient-to-br p-2.5 shadow-lg ${template.colors.join(' ')}`}>
                  {/* Special effects for different styles */}
                  {template.style === 'cyberpunk' && (
                    <div className="absolute inset-0 bg-gradient-to-r from-green-400/10 via-transparent to-green-400/10"></div>
                  )}
                  {template.style === 'electric' && (
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 via-transparent to-cyan-400/20"></div>
                  )}
                  
                  {/* Modern header simulation */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-5 h-5 rounded-full border-2 ${
                      template.id === 'minimal' ? 'bg-gray-600 border-gray-400' : 
                      template.id === 'black' ? 'bg-black border-green-400' :
                      'bg-white/20 border-white/40'
                    } shadow-md`}></div>
                    <div className={`h-2 w-20 rounded-full ${
                      template.id === 'minimal' ? 'bg-gray-600' : 
                      template.id === 'black' ? 'bg-green-400/80' :
                      'bg-white/40'
                    } shadow-sm`}></div>
                  </div>
                  
                  {/* Enhanced content lines */}
                  <div className="space-y-1">
                    <div className={`h-1.5 w-24 rounded-full ${
                      template.id === 'minimal' ? 'bg-gray-500' : 
                      template.id === 'black' ? 'bg-green-400/60' :
                      'bg-white/30'
                    } shadow-sm`}></div>
                    <div className={`h-1 w-16 rounded-full ${
                      template.id === 'minimal' ? 'bg-gray-400' : 
                      template.id === 'black' ? 'bg-green-400/40' :
                      'bg-white/25'
                    }`}></div>
                    <div className={`h-1 w-14 rounded-full ${
                      template.id === 'minimal' ? 'bg-gray-400' : 
                      template.id === 'black' ? 'bg-green-400/40' :
                      'bg-white/25'
                    }`}></div>
                  </div>
                  
                  {/* Accent elements */}
                  <div className={`absolute bottom-2 right-2 w-2 h-2 rounded-full ${
                    template.id === 'minimal' ? 'bg-gray-600' :
                    template.id === 'black' ? 'bg-green-400' :
                    template.id === 'neon' ? 'bg-cyan-400' :
                    template.id === 'sunset' ? 'bg-orange-400' :
                    'bg-purple-400'
                  } shadow-lg`}></div>
                  
                  {/* Selected indicator */}
                  {selectedTemplate === template.id && (
                    <div className="absolute top-2 right-2">
                      <CheckCircle className="h-5 w-5 text-purple-400 drop-shadow-lg" />
                    </div>
                  )}
                </div>
                
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-white font-medium text-sm">{template.name}</h4>
                    <p className="text-gray-400 text-xs">{template.description}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation()
                      handlePreviewClick(template.id)
                    }}
                    className="text-gray-400 hover:text-white p-1 h-auto"
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          
          {/* Quick Actions */}
          <div className="border-t border-gray-800/80 pt-3">
            <Button
              size="sm"
              variant="outline"
              className="w-full rounded-xl border-gray-700/80 bg-transparent text-xs text-white hover:bg-white/5"
              onClick={() => handlePreviewClick(selectedTemplate)}
            >
              <Eye className="h-3 w-3 mr-2" />
              Preview Current Template
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Full Template Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <Card className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-gray-800/80 shadow-2xl">
            <CardHeader className="bg-gradient-to-br from-[#191c24] to-[#23263a] text-white">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Template Preview: {templates.find(t => t.id === previewTemplate)?.name}</CardTitle>
                  <CardDescription className="text-gray-400">
                    See how your EPK will look with this template
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      onTemplateChange(previewTemplate)
                      setShowPreviewModal(false)
                    }}
                    className="bg-purple-600 text-white hover:bg-purple-700"
                  >
                    Select Template
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowPreviewModal(false)}
                    className="rounded-xl border-gray-700/80 text-white hover:bg-white/5"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <TemplatePreview template={previewTemplate} epkData={epkData} />
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}

// Template Preview Component
function TemplatePreview({ template, epkData }: {
  template: string
  epkData: EPKData
}) {
  const getTemplateStyles = (templateId: string) => {
    switch (templateId) {
      case 'modern':
        return {
          bg: 'bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900',
          cardBg: 'bg-white/5 backdrop-blur-xl border border-white/10',
          textPrimary: 'text-white',
          textSecondary: 'text-purple-200',
          accent: 'text-purple-400',
          border: 'border-purple-400/20',
          shadow: 'shadow-2xl shadow-purple-500/10'
        }
      case 'black':
        return {
          bg: 'bg-black',
          cardBg: 'bg-gray-900/80 backdrop-blur-xl border border-green-400/20',
          textPrimary: 'text-white',
          textSecondary: 'text-gray-300',
          accent: 'text-green-400',
          border: 'border-green-400/30',
          shadow: 'shadow-2xl shadow-green-400/20',
          glow: 'shadow-lg shadow-green-400/30'
        }
      case 'minimal':
        return {
          bg: 'bg-gradient-to-br from-gray-50 via-white to-gray-100',
          cardBg: 'bg-white/90 backdrop-blur-sm border border-gray-200/50',
          textPrimary: 'text-gray-900',
          textSecondary: 'text-gray-600',
          accent: 'text-gray-800',
          border: 'border-gray-200',
          shadow: 'shadow-xl shadow-gray-200/50'
        }
      case 'neon':
        return {
          bg: 'bg-gradient-to-br from-blue-950 via-cyan-900 to-teal-900',
          cardBg: 'bg-black/40 backdrop-blur-xl border border-cyan-400/20',
          textPrimary: 'text-white',
          textSecondary: 'text-cyan-200',
          accent: 'text-cyan-400',
          border: 'border-cyan-400/30',
          shadow: 'shadow-2xl shadow-cyan-400/20',
          glow: 'shadow-lg shadow-cyan-400/30'
        }
      case 'sunset':
        return {
          bg: 'bg-gradient-to-br from-orange-900 via-pink-900 to-purple-900',
          cardBg: 'bg-black/30 backdrop-blur-xl border border-orange-400/20',
          textPrimary: 'text-white',
          textSecondary: 'text-orange-200',
          accent: 'text-orange-400',
          border: 'border-orange-400/30',
          shadow: 'shadow-2xl shadow-orange-400/20'
        }
      default:
        return {
          bg: 'bg-gradient-to-br from-indigo-900 to-purple-900',
          cardBg: 'bg-white/10 backdrop-blur-xl',
          textPrimary: 'text-white',
          textSecondary: 'text-purple-200',
          accent: 'text-purple-400',
          border: 'border-purple-400/30',
          shadow: 'shadow-2xl shadow-purple-500/10'
        }
    }
  }

  const styles = getTemplateStyles(template)

  return (
    <div className={`min-h-[600px] p-8 ${styles.bg}`}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Enhanced Header with Modern Design */}
        <div className={`${styles.cardBg} ${styles.shadow} rounded-2xl p-8 relative overflow-hidden`}>
          {/* Background effects for special templates */}
          {template === 'black' && (
            <div className="absolute inset-0 bg-gradient-to-r from-green-400/5 via-transparent to-green-400/5"></div>
          )}
          {template === 'neon' && (
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/10 via-transparent to-cyan-400/10"></div>
          )}
          
          <div className="relative z-10">
            <div className="flex items-center gap-6 mb-6">
              <div className={`w-20 h-20 rounded-2xl ${
                template === 'black' ? 'bg-gradient-to-br from-green-400 to-emerald-500' :
                template === 'neon' ? 'bg-gradient-to-br from-cyan-400 to-blue-500' :
                template === 'sunset' ? 'bg-gradient-to-br from-orange-400 to-pink-500' :
                'bg-gradient-to-br from-purple-500 to-pink-500'
              } flex items-center justify-center shadow-xl ${
                template === 'black' ? 'shadow-green-400/30' :
                template === 'neon' ? 'shadow-cyan-400/30' :
                'shadow-purple-500/30'
              }`}>
                <span className="text-white font-bold text-2xl">
                  {epkData.artistName ? epkData.artistName[0] : 'A'}
                </span>
              </div>
              <div>
                <h1 className={`text-3xl font-bold ${styles.textPrimary} mb-1`}>
                  {epkData.artistName || 'Artist Name'}
                </h1>
                <p className={`${styles.textSecondary} text-lg`}>
                  {epkData.genre || 'Genre'} • {epkData.location || 'Location'}
                </p>
              </div>
            </div>
            <p className={`${styles.textSecondary} leading-relaxed text-lg`}>
              {epkData.bio || 'Artist biography will appear here. This is where you can share your musical journey, influences, and what makes your sound unique.'}
            </p>
          </div>
        </div>

        {/* Enhanced Stats with Modern Design */}
        <div className={`${styles.cardBg} ${styles.shadow} rounded-2xl p-8`}>
          <h3 className={`text-xl font-bold ${styles.textPrimary} mb-6 flex items-center gap-2`}>
            <TrendingUp className={`h-5 w-5 ${styles.accent}`} />
            Performance Metrics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className={`text-center p-4 rounded-xl ${
              template === 'minimal' ? 'bg-gray-100' : 'bg-black/20'
            } backdrop-blur-sm`}>
              <div className={`text-3xl font-bold ${styles.accent} mb-1 ${
                template === 'black' ? styles.glow : ''
              }`}>
                {epkData.stats?.monthlyListeners || 0}K
              </div>
              <div className={`text-sm ${styles.textSecondary} font-medium`}>Monthly Listeners</div>
            </div>
            <div className={`text-center p-4 rounded-xl ${
              template === 'minimal' ? 'bg-gray-100' : 'bg-black/20'
            } backdrop-blur-sm`}>
              <div className={`text-3xl font-bold ${styles.accent} mb-1 ${
                template === 'black' ? styles.glow : ''
              }`}>
                {(epkData.stats?.followers ?? epkData.social.reduce((total, link) => total + (link.followers || 0), 0)).toLocaleString()}
              </div>
              <div className={`text-sm ${styles.textSecondary} font-medium`}>Followers</div>
            </div>
            <div className={`text-center p-4 rounded-xl ${
              template === 'minimal' ? 'bg-gray-100' : 'bg-black/20'
            } backdrop-blur-sm`}>
              <div className={`text-3xl font-bold ${styles.accent} mb-1 ${
                template === 'black' ? styles.glow : ''
              }`}>
                {epkData.music.length}
              </div>
              <div className={`text-sm ${styles.textSecondary} font-medium`}>Releases</div>
            </div>
            <div className={`text-center p-4 rounded-xl ${
              template === 'minimal' ? 'bg-gray-100' : 'bg-black/20'
            } backdrop-blur-sm`}>
              <div className={`text-3xl font-bold ${styles.accent} mb-1 ${
                template === 'black' ? styles.glow : ''
              }`}>
                {epkData.upcomingShows.length}
              </div>
              <div className={`text-sm ${styles.textSecondary} font-medium`}>Shows</div>
            </div>
          </div>
        </div>

        {/* Enhanced Music & Social Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={`${styles.cardBg} ${styles.shadow} rounded-2xl p-8`}>
            <h3 className={`text-xl font-bold ${styles.textPrimary} mb-6 flex items-center gap-2`}>
              <Music className={`h-5 w-5 ${styles.accent}`} />
              Latest Music
            </h3>
            <div className="space-y-4">
              {(epkData.music.length > 0 ? epkData.music.slice(0, 3) : [
                { title: 'Latest Single', platform: 'Spotify' },
                { title: 'Popular Track', platform: 'Apple Music' },
                { title: 'Fan Favorite', platform: 'SoundCloud' }
              ]).map((track, index) => (
                <div key={index} className={`flex items-center justify-between p-4 rounded-xl ${
                  template === 'minimal' ? 'bg-gray-100' : 'bg-black/20'
                } backdrop-blur-sm hover:scale-105 transition-transform duration-200`}>
                  <div>
                    <div className={`font-semibold ${styles.textPrimary} text-lg`}>{track.title}</div>
                    <div className={`text-sm ${styles.textSecondary} font-medium`}>{track.platform}</div>
                  </div>
                  <div className={`${styles.accent} p-2 rounded-lg ${
                    template === 'minimal' ? 'bg-white' : 'bg-white/10'
                  } ${template === 'black' ? styles.glow : ''}`}>
                    <Play className="h-5 w-5" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`${styles.cardBg} ${styles.shadow} rounded-2xl p-8`}>
            <h3 className={`text-xl font-bold ${styles.textPrimary} mb-6 flex items-center gap-2`}>
              <Globe className={`h-5 w-5 ${styles.accent}`} />
              Connect
            </h3>
            <div className="space-y-4">
              {(epkData.social.length > 0 ? epkData.social.slice(0, 3) : [
                { platform: 'Instagram', username: '@artist' },
                { platform: 'Spotify', username: 'Artist Profile' },
                { platform: 'YouTube', username: '@artistchannel' }
              ]).map((social, index) => (
                <div key={index} className={`flex items-center gap-4 p-4 rounded-xl ${
                  template === 'minimal' ? 'bg-gray-100' : 'bg-black/20'
                } backdrop-blur-sm hover:scale-105 transition-transform duration-200`}>
                  <div className={`w-12 h-12 rounded-xl ${
                    template === 'black' ? 'bg-green-400/20 border border-green-400/30' :
                    template === 'neon' ? 'bg-cyan-400/20 border border-cyan-400/30' :
                    template === 'sunset' ? 'bg-orange-400/20 border border-orange-400/30' :
                    template === 'minimal' ? 'bg-gray-200' :
                    'bg-purple-400/20 border border-purple-400/30'
                  } flex items-center justify-center ${
                    template === 'black' ? styles.glow : ''
                  }`}>
                    <Globe className={`h-5 w-5 ${styles.accent}`} />
                  </div>
                  <div>
                    <div className={`font-semibold ${styles.textPrimary} text-lg`}>{social.platform}</div>
                    <div className={`text-sm ${styles.textSecondary} font-medium`}>{social.username}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className={`${styles.cardBg} ${styles.border} border rounded-xl p-6`}>
          <h3 className={`text-lg font-semibold ${styles.textPrimary} mb-4`}>Contact</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className={`font-medium ${styles.textPrimary}`}>Email</div>
              <div className={`text-sm ${styles.textSecondary}`}>
                {epkData.contact.email || 'contact@artist.com'}
              </div>
            </div>
            <div>
              <div className={`font-medium ${styles.textPrimary}`}>Booking</div>
              <div className={`text-sm ${styles.textSecondary}`}>
                {epkData.contact.bookingEmail || 'booking@artist.com'}
              </div>
            </div>
            <div>
              <div className={`font-medium ${styles.textPrimary}`}>Website</div>
              <div className={`text-sm ${styles.textSecondary}`}>
                {epkData.contact.website || 'www.artist.com'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function EPKPage() {
  const { toast } = useToast()
  const { 
    epkData, 
    isLoading, 
    isSaving, 
    updateEPKData, 
    saveEPKData, 
    syncWithProfile 
  } = useEPKSync()
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState("overview")
  const [previewMode, setPreviewMode] = useState(false)
  const [uploadingMedia, setUploadingMedia] = useState(false)

  useEffect(() => {
    if (!epkData?.artistName) return
    const nextSlug = epkData.artistName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
    if (!epkData.epkSlug) updateEPKData({ epkSlug: nextSlug })
  }, [epkData?.artistName, epkData?.epkSlug, updateEPKData])

  const handleSave = async () => {
    await saveEPKData()
  }

  const handlePreview = () => {
    setPreviewMode(!previewMode)
  }

  const handleShare = () => {
    if (!epkData?.epkSlug) return
    
    const url = `${window.location.origin}/epk/${epkData.epkSlug}`
    navigator.clipboard.writeText(url)
    fetch('/api/epk/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ epkSlug: epkData.epkSlug, eventType: 'share_copy' })
    }).catch(() => null)
    toast({
      title: "EPK URL copied!",
      description: "Share this link to showcase your EPK.",
    })
  }

  const handleDownload = async () => {
    if (!epkData) return
    try {
      const doc = (
        <EPKDocument
          data={{
            artistName: epkData.artistName,
            bio: epkData.bio,
            genre: epkData.genre,
            location: epkData.location,
            avatarUrl: epkData.avatarUrl,
            stats: epkData.stats,
            music: epkData.music.map(track => ({
              title: track.title,
              url: track.url,
              releaseDate: track.releaseDate,
              streams: track.streams
            })),
            photos: epkData.photos.map(photo => photo.url),
            press: epkData.press.map(item => ({
              title: item.title,
              url: item.url,
              date: item.date,
              outlet: item.outlet
            })),
            contact: {
              email: epkData.contact.email,
              phone: epkData.contact.phone,
              website: epkData.contact.website,
              bookingEmail: epkData.contact.bookingEmail,
              managementEmail: epkData.contact.managementEmail
            },
            social: epkData.social.map(link => ({ platform: link.platform, url: link.url })),
            upcomingShows: epkData.upcomingShows.map(show => ({
              date: show.date,
              venue: show.venue,
              location: show.location,
              ticketUrl: show.ticketUrl
            }))
          }}
        />
      )
      const blob = await pdf(doc).toBlob()
      const downloadUrl = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = downloadUrl
      anchor.download = `${epkData.epkSlug || "artist"}-epk.pdf`
      anchor.click()
      URL.revokeObjectURL(downloadUrl)
      fetch('/api/epk/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ epkSlug: epkData.epkSlug, eventType: 'pdf_download' })
      }).catch(() => null)
      toast({
        title: "PDF downloaded",
        description: "Your EPK PDF was generated successfully."
      })
    } catch (error) {
      toast({
        title: "PDF generation failed",
        description: "Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover' | 'photos') => {
    const files = e.target.files
    if (!files || !epkData) return
    setUploadingMedia(true)
    try {
      const uploadedUrls: string[] = []
      for (const file of Array.from(files)) {
        const extension = file.name.split(".").pop() || "jpg"
        const fileName = `epk-${type}-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`
        const path = `${epkData.epkSlug || "artist"}/${fileName}`
        const { data, error } = await supabase.storage.from("post-media").upload(path, file, { upsert: false })
        if (error) throw error
        const { data: publicUrlData } = supabase.storage.from("post-media").getPublicUrl(data.path)
        uploadedUrls.push(publicUrlData.publicUrl)
      }

      if (type === 'avatar' && uploadedUrls[0]) updateEPKData({ avatarUrl: uploadedUrls[0] })
      if (type === 'cover' && uploadedUrls[0]) updateEPKData({ coverUrl: uploadedUrls[0] })
      if (type === 'photos') {
        const nextPhotos = uploadedUrls.map(url => ({
          id: `${Date.now()}-${Math.random()}`,
          url,
          caption: "",
          isHero: false
        }))
        updateEPKData({ photos: [...epkData.photos, ...nextPhotos] })
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Could not upload selected media.",
        variant: "destructive"
      })
    } finally {
      setUploadingMedia(false)
    }
  }

  // Show loading state
  if (isLoading || !epkData) {
    return (
      <div className="min-h-screen bg-[#181b23] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 mx-auto text-purple-500 animate-spin mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Loading your EPK...</h2>
          <p className="text-gray-400">This might take a moment</p>
        </div>
      </div>
    )
  }

  if (previewMode) {
    return (
      <EpkBuilderView
        epkData={epkData}
        updateEPKData={updateEPKData}
        onSave={handleSave}
        onShare={handleShare}
        onExitPreview={handlePreview}
        onNavigateToTab={(tab) => { setActiveTab(tab); setPreviewMode(false) }}
        isSaving={isSaving}
      />
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#181b23] lg:flex-row">
      {/* Main Content */}
      <main className="min-w-0 flex-1 px-4 py-4 sm:px-6 lg:py-5 lg:pl-8 lg:pr-3">
        <div className="mx-auto max-w-[1200px] xl:max-w-none">
        {/* Header */}
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Electronic Press Kit</h1>
            <p className="mt-0.5 text-sm text-gray-400 sm:text-base">Create a stunning EPK to showcase your artistry</p>
          </div>
          <div className="flex flex-shrink-0 flex-wrap gap-2">
            <Button onClick={syncWithProfile} variant="outline" className="rounded-xl border-gray-700/80 text-white hover:bg-white/5">
              <Link className="h-4 w-4 mr-2" />
              Sync with Profile
            </Button>
            <Button variant="outline" onClick={handleSave} className="rounded-xl border-gray-700/80 text-white hover:bg-white/5">
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
            <Button onClick={handlePreview} className="rounded-xl bg-purple-600 text-white hover:bg-purple-700">
              <Eye className="h-4 w-4 mr-2" />
              Preview EPK
            </Button>
          </div>
        </div>

        {/* EPK Status */}
        <Card className={`${epkSurface} mb-4 border-white/10`}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 shrink-0 text-purple-400" />
                  <span className="text-sm font-medium text-white sm:text-base">Public EPK</span>
                </div>
                <Switch 
                  checked={epkData.isPublic}
                  onCheckedChange={(checked) => updateEPKData({ isPublic: checked })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={epkData.isPublic ? "default" : "secondary"} className="rounded-lg bg-purple-600">
                  {epkData.isPublic ? "Live" : "Draft"}
                </Badge>
                {epkData.isPublic && (
                  <Button size="sm" variant="ghost" onClick={handleShare} className="rounded-xl text-purple-400 hover:bg-white/5 hover:text-purple-300">
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View Live
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="flex h-auto w-full flex-wrap gap-1 rounded-2xl border border-gray-800/80 bg-[#13151c] p-1">
            <TabsTrigger value="overview" className="rounded-xl data-[state=active]:bg-purple-600 data-[state=active]:text-white">Overview</TabsTrigger>
            <TabsTrigger value="music" className="rounded-xl data-[state=active]:bg-purple-600 data-[state=active]:text-white">Music</TabsTrigger>
            <TabsTrigger value="shows" className="rounded-xl data-[state=active]:bg-purple-600 data-[state=active]:text-white">Shows</TabsTrigger>
            <TabsTrigger value="social" className="rounded-xl data-[state=active]:bg-purple-600 data-[state=active]:text-white">Social</TabsTrigger>
            <TabsTrigger value="contact" className="rounded-xl data-[state=active]:bg-purple-600 data-[state=active]:text-white">Contact</TabsTrigger>
            <TabsTrigger value="media" className="rounded-xl data-[state=active]:bg-purple-600 data-[state=active]:text-white">Media</TabsTrigger>
            <TabsTrigger value="press" className="rounded-xl data-[state=active]:bg-purple-600 data-[state=active]:text-white">Press</TabsTrigger>
            <TabsTrigger value="settings" className="rounded-xl data-[state=active]:bg-purple-600 data-[state=active]:text-white">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(260px,300px)]">
              <div className="space-y-4">
                {/* Hero Section */}
                <Card className={`${epkSurface} border-white/10`}>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-semibold tracking-tight text-white flex items-center gap-2">
                      <Star className="h-4 w-4 shrink-0 text-purple-400" />
                      Hero Section
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 p-4 pt-0">
                    <div className="relative">
                      <div className="relative flex h-36 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-r from-purple-900 to-blue-900 sm:h-40">
                        {epkData.coverUrl ? (
                          <img src={epkData.coverUrl} alt="Cover" className="h-full w-full object-cover" />
                        ) : (
                          <div className="text-center text-white">
                            <Camera className="mx-auto mb-2 h-8 w-8 opacity-50" />
                            <p className="text-sm opacity-75">Add cover image</p>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity hover:opacity-100"
                        >
                          <Upload className="h-6 w-6 text-white" />
                        </button>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, 'cover')}
                      />
                    </div>
                    
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <div className="relative shrink-0">
                        <Avatar className="h-20 w-20 rounded-2xl border-2 border-purple-500/80 sm:h-[72px] sm:w-[72px]">
                          <AvatarImage src={epkData.avatarUrl} className="rounded-2xl object-cover" />
                          <AvatarFallback className="rounded-2xl">{epkData.artistName[0] || 'A'}</AvatarFallback>
                        </Avatar>
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.createElement('input')
                            input.type = 'file'
                            input.accept = 'image/*'
                            input.onchange = (e) => handleFileUpload(e as any, 'avatar')
                            input.click()
                          }}
                          className="absolute -bottom-1 -right-1 rounded-full bg-purple-600 p-1.5 shadow-lg transition hover:bg-purple-700"
                        >
                          <Camera className="h-3 w-3 text-white" />
                        </button>
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        <Input
                          placeholder="Artist Name"
                          value={epkData.artistName}
                          onChange={(e) => updateEPKData({ artistName: e.target.value })}
                          className={`${epkInput} text-lg font-semibold`}
                        />
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <Input
                            placeholder="Genre"
                            value={epkData.genre}
                            onChange={(e) => updateEPKData({ genre: e.target.value })}
                            className={epkInput}
                          />
                          <Input
                            placeholder="Location"
                            value={epkData.location}
                            onChange={(e) => updateEPKData({ location: e.target.value })}
                            className={epkInput}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Bio Section */}
                <Card className={`${epkSurface} border-white/10`}>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-semibold tracking-tight text-white flex items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-purple-400" />
                      Artist Biography
                    </CardTitle>
                    <CardDescription className="text-xs text-gray-400">
                      Tell your story in a compelling way that captures your artistic journey
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <Textarea
                      placeholder="Write your artist biography here... Share your musical journey, influences, achievements, and what makes your sound unique."
                      value={epkData.bio}
                      onChange={(e) => updateEPKData({ bio: e.target.value })}
                      className={`min-h-[160px] resize-none text-sm sm:min-h-[180px] ${epkInput}`}
                    />
                    <div className="flex justify-between items-center mt-2 text-xs text-gray-400">
                      <span>{epkData.bio.length} characters</span>
                      <span>Tip: Aim for 150-300 words</span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4 xl:sticky xl:top-4 xl:self-start">
                <StatsOverview stats={epkData.stats} epkData={epkData} onImportFromProfile={syncWithProfile} />
                <TemplateSelector 
                  selectedTemplate={epkData.template}
                  onTemplateChange={(template) => updateEPKData({ template })}
                  epkData={epkData}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="music">
            <MusicSection
              tracks={epkData.music}
              onTracksChange={(tracks) => updateEPKData({ music: tracks })}
            />
          </TabsContent>

          <TabsContent value="shows">
            <ShowsSection
              shows={epkData.upcomingShows}
              onShowsChange={(shows) => updateEPKData({ upcomingShows: shows })}
            />
          </TabsContent>

          <TabsContent value="social">
            <SocialSection
              socialLinks={epkData.social}
              onSocialLinksChange={(social) => updateEPKData({ social })}
            />
            {/* Live analytics refresh */}
            <div className="mt-4 flex items-center gap-2">
              <Button
                variant="outline"
                className="rounded-xl border-gray-700/80 text-white hover:bg-white/5"
                onClick={async () => {
                  const token = (await (await import('@supabase/auth-helpers-nextjs')).createClientComponentClient()).auth
                  const session = await token.getSession()
                  await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/social-analytics`, {
                    method: 'POST',
                    headers: { authorization: `Bearer ${session.data.session?.access_token}` }
                  })
                }}
              >
                Refresh Analytics
              </Button>
              <p className="text-xs text-gray-500">Updates followers and reach from connected platforms</p>
            </div>
          </TabsContent>

          <TabsContent value="media">
            <Card className={`${epkSurface} border-white/10`}>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-semibold text-white">Press Photos</CardTitle>
                <CardDescription className="text-xs text-gray-400">Upload high quality media for your one-page EPK.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-4 pt-0">
                <Button
                  variant="outline"
                  className="rounded-xl border-gray-700/80 text-white hover:bg-white/5"
                  onClick={() => {
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.accept = 'image/*'
                    input.multiple = true
                    input.onchange = (event) => handleFileUpload(event as any, 'photos')
                    input.click()
                  }}
                  disabled={uploadingMedia}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {uploadingMedia ? 'Uploading...' : 'Upload Photos'}
                </Button>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {epkData.photos.map((photo) => (
                    <div key={photo.id} className="relative overflow-hidden rounded-xl border border-gray-800/60 bg-[#23263a]">
                      <img src={photo.url} alt="EPK photo" className="h-28 w-full object-cover" />
                      <Input
                        value={photo.caption}
                        placeholder="Caption"
                        className="rounded-xl rounded-t-none border-0 border-t border-gray-800/80 bg-[#13151c] text-xs text-white"
                        onChange={(event) =>
                          updateEPKData({
                            photos: epkData.photos.map(item =>
                              item.id === photo.id ? { ...item, caption: event.target.value } : item
                            )
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="press">
            <Card className={`${epkSurface} border-white/10`}>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-semibold text-white">Press Highlights</CardTitle>
                <CardDescription className="text-xs text-gray-400">Feature quotes/articles that provide social proof.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 p-4 pt-0">
                <Button
                  size="sm"
                  className="rounded-xl"
                  onClick={() =>
                    updateEPKData({
                      press: [
                        ...epkData.press,
                        { id: `${Date.now()}`, title: '', url: '', date: '', outlet: '', excerpt: '' }
                      ]
                    })
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Press Item
                </Button>
                {epkData.press.map((item) => (
                  <div key={item.id} className="grid gap-2 rounded-xl border border-gray-800/60 bg-[#1a1d28]/80 p-3 md:grid-cols-2">
                    <Input
                      value={item.title}
                      onChange={(event) =>
                        updateEPKData({
                          press: epkData.press.map(pressItem => pressItem.id === item.id ? { ...pressItem, title: event.target.value } : pressItem)
                        })
                      }
                      placeholder="Headline"
                      className={epkInput}
                    />
                    <Input
                      value={item.outlet}
                      onChange={(event) =>
                        updateEPKData({
                          press: epkData.press.map(pressItem => pressItem.id === item.id ? { ...pressItem, outlet: event.target.value } : pressItem)
                        })
                      }
                      placeholder="Outlet"
                      className={epkInput}
                    />
                    <Input
                      value={item.url}
                      onChange={(event) =>
                        updateEPKData({
                          press: epkData.press.map(pressItem => pressItem.id === item.id ? { ...pressItem, url: event.target.value } : pressItem)
                        })
                      }
                      placeholder="Article URL"
                      className={epkInput}
                    />
                    <Input
                      type="date"
                      value={item.date}
                      onChange={(event) =>
                        updateEPKData({
                          press: epkData.press.map(pressItem => pressItem.id === item.id ? { ...pressItem, date: event.target.value } : pressItem)
                        })
                      }
                      className={epkInput}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact">
            <ContactSection
              contact={epkData.contact}
              onContactChange={(contact) => updateEPKData({ contact })}
            />
          </TabsContent>

          <TabsContent value="settings">
            <div className="space-y-6">
              <Card className={`${epkSurface} border-white/10`}>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-semibold text-white">EPK URL and SEO</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 p-4 pt-0 md:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-300">Public slug</Label>
                    <Input
                      value={epkData.epkSlug}
                      onChange={(event) =>
                        updateEPKData({
                          epkSlug: event.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9\s-]/g, '')
                            .trim()
                            .replace(/\s+/g, '-')
                        })
                      }
                      className={epkInput}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-300">Custom domain</Label>
                    <Input
                      value={epkData.customDomain}
                      onChange={(event) => updateEPKData({ customDomain: event.target.value })}
                      className={epkInput}
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label className="text-xs text-gray-300">One-line pitch</Label>
                    <Input
                      value={epkData.bookingAssets.oneLiner}
                      onChange={(event) =>
                        updateEPKData({
                          bookingAssets: { ...epkData.bookingAssets, oneLiner: event.target.value }
                        })
                      }
                      className={epkInput}
                      placeholder="One sentence summary for bookers and press"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-300">Tech rider URL</Label>
                    <Input
                      value={epkData.bookingAssets.techRiderUrl}
                      onChange={(event) =>
                        updateEPKData({
                          bookingAssets: { ...epkData.bookingAssets, techRiderUrl: event.target.value }
                        })
                      }
                      className={epkInput}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-300">Stage plot URL</Label>
                    <Input
                      value={epkData.bookingAssets.stagePlotUrl}
                      onChange={(event) =>
                        updateEPKData({
                          bookingAssets: { ...epkData.bookingAssets, stagePlotUrl: event.target.value }
                        })
                      }
                      className={epkInput}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className={`${epkSurface} border-white/10`}>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-semibold text-white">Audience Presets</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2 p-4 pt-0">
                  {(['booker', 'festival', 'press'] as const).map((preset) => (
                    <Button
                      key={preset}
                      variant={epkData.layout.preset === preset ? "default" : "outline"}
                      className={epkData.layout.preset === preset ? "rounded-xl bg-purple-600 text-white hover:bg-purple-700" : "rounded-xl border-gray-700/80 text-white hover:bg-white/5"}
                      onClick={() => {
                        const orderByPreset: Record<string, string[]> = {
                          booker: ['hero', 'one-liner', 'music', 'shows', 'stats', 'press', 'contact', 'booking', 'social', 'media'],
                          festival: ['hero', 'one-liner', 'shows', 'music', 'stats', 'media', 'press', 'contact', 'booking', 'social'],
                          press: ['hero', 'one-liner', 'press', 'bio', 'music', 'stats', 'media', 'shows', 'contact', 'social']
                        }
                        updateEPKData({
                          layout: {
                            ...epkData.layout,
                            preset,
                            sectionOrder: orderByPreset[preset]
                          }
                        })
                      }}
                    >
                      {preset}
                    </Button>
                  ))}
                </CardContent>
              </Card>

              <Card className={`${epkSurface} border-white/10`}>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-semibold text-white">EPK Quality</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="mb-2 text-sm text-white">Score: {epkData.quality.score}%</div>
                  <div className="space-y-1 text-sm text-gray-300">
                    {epkData.quality.missing.length === 0 ? (
                      <p>All core checklist items are complete.</p>
                    ) : (
                      epkData.quality.missing.map((item) => <p key={item}>Missing: {item}</p>)
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className={`${epkSurface} border-white/10`}>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-semibold text-white">Typography</CardTitle>
                  <CardDescription className="text-xs text-gray-400">
                    Font applied to your live EPK and preview
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <Label className="text-xs text-gray-300">Font family</Label>
                  <Select
                    value={epkData.epkFont}
                    onValueChange={(value) =>
                      updateEPKData({ epkFont: value as EPKData["epkFont"] })
                    }
                  >
                    <SelectTrigger className={`${epkInput} mt-1`}>
                      <SelectValue placeholder="Select font" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sans">Sans — clean UI (Inter)</SelectItem>
                      <SelectItem value="serif">Serif — editorial (Playfair)</SelectItem>
                      <SelectItem value="display">Display — poster (Bebas)</SelectItem>
                      <SelectItem value="geometric">Geometric — modern (Space Grotesk)</SelectItem>
                      <SelectItem value="mono">Mono — technical (JetBrains)</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              <Card className={`${epkSurface} border-white/10`}>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm font-semibold text-white">One-Page Section Layout</CardTitle>
                  <CardDescription className="text-xs text-gray-400">
                    Drag sections in the Preview to reorder. Toggle visibility below.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 p-4 pt-0">
                  {epkData.layout.sectionOrder.map((section) => (
                    <div key={section} className="flex items-center gap-2 rounded-xl border border-gray-800/50 bg-[#1a1d28]/80 p-2.5">
                      <div className="min-w-28 text-sm capitalize text-white">{section}</div>
                      <Switch
                        checked={Boolean(epkData.layout.sectionVisibility[section])}
                        onCheckedChange={(checked) =>
                          updateEPKData({
                            layout: {
                              ...epkData.layout,
                              sectionVisibility: {
                                ...epkData.layout.sectionVisibility,
                                [section]: checked
                              }
                            }
                          })
                        }
                      />
                    </div>
                  ))}
                  <Button
                    onClick={handlePreview}
                    variant="outline"
                    className="mt-2 w-full rounded-xl border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
                  >
                    <Layout className="mr-2 h-4 w-4" />
                    Open Builder to reorder
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
        </div>
      </main>

      {/* Right Sidebar — quick actions; mirrors dashboard card radius */}
      <aside className="flex w-full shrink-0 flex-col gap-3 border-t border-gray-800/80 bg-[#181b23] p-4 lg:w-[280px] lg:border-l lg:border-t-0 lg:py-5 lg:pl-3 lg:pr-4">
        <QuickActions 
          onPreview={handlePreview}
          onShare={handleShare}
          onDownload={handleDownload}
        />
      </aside>
    </div>
  )
} 