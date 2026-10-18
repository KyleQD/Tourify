/**
 * Guestlist Games are first-party interstitial feed modules. These are NOT
 * social posts, don't consume API pagination offsets, and never bypass feed
 * visibility controls. Slots count the rendered organic posts only.
 */
export type GuestlistFrequency = 'normal' | 'fewer' | 'off'
export type GuestlistGameId = 'beat-deck' | 'dj-odyssey'
export type GuestlistFeedTab = 'following' | 'all' | 'personal'
export type GuestlistDiscoveryModule = 'events' | 'music' | 'artists'

export const GUESTLIST_PREFERENCE_KEY = 'tourify:guestlist-games:frequency:v1'

export interface GuestlistSlot {
  key: string
  game: GuestlistGameId
  afterPost: number
}

export function parseGuestlistFrequency(value: unknown): GuestlistFrequency {
  return value === 'fewer' || value === 'off' ? value : 'normal'
}

/** Default: one after organic post #10 and another after #30.
 * Fewer: a single break after #30. Off/personal: no games.
 * Cards do not count as posts and are never inserted into post API data. */
export function getGuestlistGameSlot(
  afterPost: number,
  tab: GuestlistFeedTab | string,
  frequency: GuestlistFrequency,
): GuestlistSlot | null {
  if (tab !== 'following' && tab !== 'all') return null
  if (frequency === 'off') return null
  if (frequency === 'normal' && afterPost === 10) {
    return { key: 'guestlist:beat-deck:10', game: 'beat-deck', afterPost }
  }
  if (afterPost === 30) {
    return {
      key: 'guestlist:' + (frequency === 'fewer' ? 'beat-deck' : 'dj-odyssey') + ':30',
      game: frequency === 'fewer' ? 'beat-deck' : 'dj-odyssey',
      afterPost,
    }
  }
  return null
}

/**
 * Move the artists rail away from the #10 Guestlist slot; keep all existing
 * discovery modules and restore their original ordering when games are off.
 */
export function getGuestlistDiscoveryModule(
  afterPost: number,
  gamesVisible: boolean,
): GuestlistDiscoveryModule | null {
  if (afterPost === 3) return 'events'
  if (afterPost === 6) return 'music'
  if (afterPost === (gamesVisible ? 14 : 10)) return 'artists'
  return null
}
