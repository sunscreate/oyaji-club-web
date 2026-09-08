import { supabase } from './supabase'
import { processImage } from './imageCompress'

const BUCKET = 'event-photos'

export interface Photo {
  id: string
  event_id: string
  storage_path: string
  thumb_path: string
  uploaded_by: string | null
  taken_at: string | null
  created_at: string
}

function uuid(): string {
  return (crypto as Crypto & { randomUUID?: () => string }).randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

/** 1枚を圧縮してアップロードし photos 行を作成 */
export async function uploadPhoto(eventId: string, file: File, userId: string): Promise<void> {
  const { full, thumb, takenAt } = await processImage(file)
  const key = uuid()
  const fullPath = `${eventId}/full/${key}.webp`
  const thumbPath = `${eventId}/thumb/${key}.webp`

  const up1 = await supabase.storage.from(BUCKET).upload(fullPath, full, { contentType: 'image/webp', upsert: false })
  if (up1.error) throw up1.error
  const up2 = await supabase.storage.from(BUCKET).upload(thumbPath, thumb, { contentType: 'image/webp', upsert: false })
  if (up2.error) throw up2.error

  const ins = await supabase.from('photos').insert({
    event_id: eventId,
    storage_path: fullPath,
    thumb_path: thumbPath,
    uploaded_by: userId,
    taken_at: takenAt,
  })
  if (ins.error) throw ins.error
}

export async function listPhotos(eventId: string): Promise<Photo[]> {
  const { data } = await supabase
    .from('photos')
    .select('*')
    .eq('event_id', eventId)
    .order('taken_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
  return (data ?? []) as Photo[]
}

/** 複数パスの署名付きURLをまとめて発行（有効期限1時間） */
export async function signedUrls(paths: string[]): Promise<Record<string, string>> {
  const map: Record<string, string> = {}
  if (paths.length === 0) return map
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600)
  ;(data ?? []).forEach((d) => {
    if (d.path && d.signedUrl) map[d.path] = d.signedUrl
  })
  return map
}

export async function signedUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
  return data?.signedUrl ?? null
}

/** ストレージ実体(本画像+サムネ)と photos 行を削除 */
export async function deletePhoto(p: Photo): Promise<void> {
  await supabase.storage.from(BUCKET).remove([p.storage_path, p.thumb_path])
  const { error } = await supabase.from('photos').delete().eq('id', p.id)
  if (error) throw error
}

/** ダウンロード用に本画像を signed URL で取得して保存 */
export async function downloadPhoto(p: Photo, index: number): Promise<void> {
  const url = await signedUrl(p.storage_path)
  if (!url) return
  const res = await fetch(url)
  const blob = await res.blob()
  triggerDownload(blob, filename(p, index))
}

export function filename(p: Photo, index: number): string {
  const d = p.taken_at ? p.taken_at.slice(0, 10).replace(/-/g, '') : 'photo'
  return `${d}_${String(index + 1).padStart(3, '0')}.webp`
}

export function triggerDownload(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
