import { supabase } from './supabase'

type BadgeNav = Navigator & {
  setAppBadge?: (n?: number) => Promise<void>
  clearAppBadge?: () => Promise<void>
}

/** アプリアイコンのバッジを設定（未対応環境は無視）。0以下はクリア。 */
export function setBadge(n: number): void {
  try {
    const nav = navigator as BadgeNav
    if (n > 0) nav.setAppBadge?.(n)
    else nav.clearAppBadge?.()
  } catch {
    /* 未対応ブラウザは無視 */
  }
}

const EPOCH = '1970-01-01T00:00:00.000Z'

/** 未読お知らせ数を数えてアイコンバッジに反映する */
export async function syncAnnouncementBadge(profileId: string): Promise<number> {
  try {
    const { data: seenRow } = await supabase
      .from('profile_notification_reads')
      .select('announcements_seen_at')
      .eq('profile_id', profileId)
      .maybeSingle()
    const seen = (seenRow as { announcements_seen_at: string | null } | null)?.announcements_seen_at ?? EPOCH
    const { count } = await supabase
      .from('announcements')
      .select('id', { count: 'exact', head: true })
      .gt('created_at', seen)
    const n = count ?? 0
    setBadge(n)
    return n
  } catch {
    return 0
  }
}

/** お知らせを既読にしてバッジをクリア */
export async function markAnnouncementsSeen(profileId: string): Promise<void> {
  const now = new Date().toISOString()
  await supabase
    .from('profile_notification_reads')
    .upsert({ profile_id: profileId, announcements_seen_at: now, updated_at: now }, { onConflict: 'profile_id' })
  setBadge(0)
}
