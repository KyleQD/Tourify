"use client"
/**
 * useVKSync
 * State management hook for the Venue Kit editor.
 * Venue equivalent of hooks/use-epk-sync.ts
 *
 * Consumed by:
 *  - app/venue/edit  (appearance panel + command header)
 *  - app/venue/kit   (builder + command header)
 */
import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useProfile } from '@/app/venue/context/profile-context'
import { useToast } from '@/components/ui/use-toast'
import {
  venueKitService,
  buildDefaultVKData,
  type VKData,
  type SaveVKSuccess,
  type SaveVKFailure,
} from '@/lib/services/venue-kit.service'

const AUTO_SAVE_DELAY_MS = 2000

interface UseVKSyncReturn {
  vkData: VKData | null
  savedVkData: VKData | null
  publicUrl: string | null
  lastSavedAt: string | null
  hasSavedVk: boolean
  isLoading: boolean
  isSaving: boolean
  isDirty: boolean
  isPublished: boolean
  saveError: string | null
  loadError: string | null
  updateVKData: (updates: Partial<VKData>) => void
  saveVK: (overrides?: Partial<VKData>) => Promise<VKData | null>
  publishVK: () => Promise<VKData | null>
  unpublishVK: () => Promise<VKData | null>
  reloadVKData: () => Promise<void>
}

export function useVKSync(): UseVKSyncReturn {
  const { user } = useAuth()
  const { profile } = useProfile()
  const { toast } = useToast()

  const [vkData, setVkData] = useState<VKData | null>(null)
  const [savedVkData, setSavedVkData] = useState<VKData | null>(null)
  const [publicUrl, setPublicUrl] = useState<string | null>(null)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [hasSavedVk, setHasSavedVk] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Pending changes accumulate here; flushed on auto-save
  const pendingRef = useRef<Partial<VKData> | null>(null)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Load ────────────────────────────────────────────────────────────────────
  const loadVKData = useCallback(async () => {
    if (!user?.id) {
      setVkData(buildDefaultVKData(profile.name))
      setSavedVkData(null)
      setPublicUrl(null)
      setLastSavedAt(null)
      setHasSavedVk(false)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setLoadError(null)

    try {
      const venueProfileId = profile.id || null
      const data = await venueKitService.loadVKData(venueProfileId, undefined, user.id)
      const saveState = await venueKitService.getVKSaveState(user.id, venueProfileId)

      // Seed identity fields from profile context on first load if the VK is new
      const isNewVk = !saveState.hasSavedVk
      const seeded: VKData = isNewVk
        ? {
            ...data,
            venueName: data.venueName || profile.name || '',
            bio: data.bio || profile.bio || profile.description || '',
            avatarUrl: data.avatarUrl || profile.avatar || '',
            location: {
              ...data.location,
              city: data.location.city || '',
              state: data.location.state || '',
            },
            website: data.website || profile.website || '',
            contact: {
              ...data.contact,
              email: data.contact.email || profile.contactEmail || '',
              phone: data.contact.phone || profile.phone || '',
            },
          }
        : data

      setVkData(seeded)
      setSavedVkData(saveState.hasSavedVk ? seeded : null)
      setPublicUrl(saveState.publicUrl)
      setLastSavedAt(saveState.lastSavedAt)
      setHasSavedVk(saveState.hasSavedVk)
      setIsDirty(false)
      pendingRef.current = null
      setSaveError(null)
    } catch (err) {
      console.error('useVKSync: error loading VK data', err)
      setVkData(buildDefaultVKData(profile.name))
      setSavedVkData(null)
      setPublicUrl(null)
      setLastSavedAt(null)
      setHasSavedVk(false)
      setLoadError(
        err instanceof Error ? err.message : 'Failed to load Venue Kit. Using default template.'
      )
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, profile.id, profile.name]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void loadVKData()
  }, [loadVKData])

  // Re-seed identity when profile context updates (e.g. after saving in /venue/edit)
  useEffect(() => {
    setVkData((prev) => {
      if (!prev) return prev
      const updated: VKData = { ...prev }
      if (profile.name && !updated.venueName) updated.venueName = profile.name
      if ((profile.bio || profile.description) && !updated.bio) {
        updated.bio = (profile.bio || profile.description) ?? ''
      }
      if (profile.avatar && !updated.avatarUrl) updated.avatarUrl = profile.avatar
      return updated
    })
  }, [profile.name, profile.bio, profile.description, profile.avatar])

  // ── Mutate ──────────────────────────────────────────────────────────────────
  const updateVKData = useCallback((updates: Partial<VKData>) => {
    setVkData((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...updates }
      pendingRef.current = { ...pendingRef.current, ...updates }
      return next
    })
    setIsDirty(true)

    // Debounce auto-save
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(() => {
      void flushAutoSave()
    }, AUTO_SAVE_DELAY_MS)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save ────────────────────────────────────────────────────────────────────
  const flushAutoSave = useCallback(async () => {
    if (!user?.id || !vkData || !pendingRef.current) return
    const pending = pendingRef.current
    pendingRef.current = null

    setIsSaving(true)
    setSaveError(null)
    try {
      const result = await venueKitService.saveVKData(user.id, {
        ...vkData,
        ...pending,
      })
      if (result.success) {
        const ok = result as SaveVKSuccess
        setSavedVkData(ok.data)
        setPublicUrl(ok.publicUrl)
        setLastSavedAt(ok.lastSavedAt)
        setHasSavedVk(true)
        setIsDirty(false)
      }
    } catch (err) {
      console.warn('useVKSync: auto-save failed', err)
    } finally {
      setIsSaving(false)
    }
  }, [user?.id, vkData])

  const saveVK = useCallback(
    async (overrides?: Partial<VKData>): Promise<VKData | null> => {
      if (!user?.id || !vkData) return null

      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
        autoSaveTimerRef.current = null
      }
      pendingRef.current = null

      setIsSaving(true)
      setSaveError(null)
      try {
        const result = await venueKitService.saveVKData(user.id, {
          ...vkData,
          ...overrides,
        })
        if (result.success) {
          const ok = result as SaveVKSuccess
          setVkData(ok.data)
          setSavedVkData(ok.data)
          setPublicUrl(ok.publicUrl)
          setLastSavedAt(ok.lastSavedAt)
          setHasSavedVk(true)
          setIsDirty(false)
          toast({ title: 'Venue Kit saved', description: 'Your changes have been saved.' })
          return ok.data
        } else {
          const fail = result as SaveVKFailure
          setSaveError(fail.error)
          toast({ title: 'Save failed', description: fail.error, variant: 'destructive' })
          return null
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to save Venue Kit'
        setSaveError(msg)
        toast({ title: 'Save failed', description: msg, variant: 'destructive' })
        return null
      } finally {
        setIsSaving(false)
      }
    },
    [user?.id, vkData, toast]
  )

  // ── Publish / Unpublish ────────────────────────────────────────────────────
  const publishVK = useCallback(async (): Promise<VKData | null> => {
    const saved = await saveVK({ isPublic: true })
    if (saved) {
      toast({ title: 'Venue Kit published', description: `Live at ${publicUrl || '/vk/...'}` })
    }
    return saved
  }, [saveVK, publicUrl, toast])

  const unpublishVK = useCallback(async (): Promise<VKData | null> => {
    const saved = await saveVK({ isPublic: false })
    if (saved) {
      toast({ title: 'Venue Kit unpublished', description: 'Your kit is now private.' })
    }
    return saved
  }, [saveVK, toast])

  // ── Reload ──────────────────────────────────────────────────────────────────
  const reloadVKData = useCallback(async () => {
    await loadVKData()
  }, [loadVKData])

  return {
    vkData,
    savedVkData,
    publicUrl,
    lastSavedAt,
    hasSavedVk,
    isLoading,
    isSaving,
    isDirty,
    isPublished: vkData?.isPublic ?? false,
    saveError,
    loadError,
    updateVKData,
    saveVK,
    publishVK,
    unpublishVK,
    reloadVKData,
  }
}
