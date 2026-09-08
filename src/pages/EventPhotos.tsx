import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  uploadPhoto, listPhotos, signedUrls, deletePhoto, downloadPhoto, signedUrl, triggerDownload, filename,
  type Photo,
} from '../lib/photos'
import { supabase } from '../lib/supabase'
import { Button, Card, EmptyState, Spinner } from '../components/ui'
import { Lightbox } from '../components/Lightbox'
import { formatDateJP } from '../lib/format'

export default function EventPhotos() {
  const { id } = useParams<{ id: string }>()
  const { profile, isStaff } = useAuth()
  const [title, setTitle] = useState('')
  const [dateStr, setDateStr] = useState('')
  const [photos, setPhotos] = useState<Photo[]>([])
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  const [fulls, setFulls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null)
  const [err, setErr] = useState('')
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    if (!id) return
    const { data: ev } = await supabase.from('events').select('title,event_date').eq('id', id).maybeSingle()
    if (ev) { setTitle((ev as { title: string }).title); setDateStr((ev as { event_date: string }).event_date) }
    const list = await listPhotos(id)
    setPhotos(list)
    const [t, f] = await Promise.all([
      signedUrls(list.map((p) => p.thumb_path)),
      signedUrls(list.map((p) => p.storage_path)),
    ])
    setThumbs(t)
    setFulls(f)
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0 || !id || !profile) return
    setErr('')
    setUploading({ done: 0, total: files.length })
    let failed = 0
    for (let i = 0; i < files.length; i++) {
      try {
        await uploadPhoto(id, files[i], profile.id)
      } catch (er) {
        failed++
        console.error('upload failed', er)
      }
      setUploading({ done: i + 1, total: files.length })
    }
    setUploading(null)
    if (fileRef.current) fileRef.current.value = ''
    if (failed > 0) setErr(`${failed}枚のアップロードに失敗しました（対応形式: JPEG/PNG/WebP/HEIC）。`)
    await load()
  }

  const canDelete = (p: Photo) => isStaff || p.uploaded_by === profile?.id

  async function removeAt(i: number) {
    const p = photos[i]
    if (!p || !canDelete(p)) return
    await deletePhoto(p)
    setLightbox(null)
    await load()
  }

  function toggleSel(pid: string) {
    const n = new Set(selected)
    n.has(pid) ? n.delete(pid) : n.add(pid)
    setSelected(n)
  }

  async function downloadSelected() {
    const chosen = photos.filter((p) => selected.has(p.id))
    if (chosen.length === 0) return
    if (chosen.length === 1) {
      await downloadPhoto(chosen[0], 0)
      return
    }
    const JSZip = (await import('jszip')).default
    const zip = new JSZip()
    for (let i = 0; i < chosen.length; i++) {
      const url = await signedUrl(chosen[i].storage_path)
      if (!url) continue
      const blob = await (await fetch(url)).blob()
      zip.file(filename(chosen[i], i), blob)
    }
    const out = await zip.generateAsync({ type: 'blob' })
    triggerDownload(out, `${dateStr || 'photos'}.zip`)
    setSelectMode(false)
    setSelected(new Set())
  }

  if (loading) return <Spinner />

  const slides = photos.map((p) => ({ url: fulls[p.storage_path] ?? '', caption: p.taken_at ? formatDateJP(p.taken_at.slice(0, 10)) : '', canDelete: canDelete(p) }))

  return (
    <div className="space-y-4">
      <Link to={`/events/${id}`} className="text-sm text-gray-500">← イベントへ戻る</Link>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold">{title} の写真</h1>
        {photos.length > 0 && (
          <button onClick={() => { setSelectMode(!selectMode); setSelected(new Set()) }} className="text-sm font-bold text-brand-red">
            {selectMode ? 'キャンセル' : '選択'}
          </button>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*,.heic,.heif" multiple hidden onChange={onFiles} />
      {!selectMode && (
        <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={!!uploading}>
          {uploading ? `アップロード中… ${uploading.done}/${uploading.total}` : '📷 写真を追加'}
        </Button>
      )}
      {err && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-brand-red">{err}</p>}

      {selectMode && (
        <div className="sticky top-14 z-10 flex items-center gap-2 rounded-xl bg-white p-2 shadow">
          <span className="ml-2 text-sm font-bold">{selected.size}枚 選択中</span>
          <button onClick={downloadSelected} disabled={selected.size === 0} className="ml-auto rounded-lg bg-brand-yellow px-4 py-2 text-sm font-bold disabled:opacity-40">ダウンロード</button>
        </div>
      )}

      {photos.length === 0 ? (
        <EmptyState>まだ写真がありません。「写真を追加」から投稿できます。</EmptyState>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {photos.map((p, i) => {
            const sel = selected.has(p.id)
            return (
              <button
                key={p.id}
                onClick={() => (selectMode ? toggleSel(p.id) : setLightbox(i))}
                className="relative aspect-square overflow-hidden rounded-lg bg-gray-100"
              >
                {thumbs[p.thumb_path] ? (
                  <img src={thumbs[p.thumb_path]} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : null}
                {selectMode && (
                  <span className={`absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs ${sel ? 'border-white bg-brand-red text-white' : 'border-white bg-black/30 text-transparent'}`}>✓</span>
                )}
              </button>
            )
          })}
        </div>
      )}

      <Card>
        <p className="text-xs text-gray-500">写真は会員のみ閲覧できます（一般公開・検索エンジンには表示されません）。削除できるのは「自分が投稿した写真」またはお世話係・会長・オーナーです。</p>
      </Card>

      {lightbox !== null && (
        <Lightbox
          slides={slides}
          index={lightbox}
          onClose={() => setLightbox(null)}
          onIndex={setLightbox}
          onDownload={(i) => downloadPhoto(photos[i], i)}
          onDelete={removeAt}
        />
      )}
    </div>
  )
}
