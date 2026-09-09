import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { formatDateJP } from '../../lib/format'
import { Button, Card, EmptyState, ErrorText, PageTitle, Spinner } from '../../components/ui'
import type { EventRow } from '../../types'

const STATUS_LABEL: Record<string, string> = { draft: '下書き', published: '公開中', finished: '終了' }
const STATUS_CLS: Record<string, string> = {
  draft: 'bg-gray-200 text-gray-700',
  published: 'bg-brand-red text-white',
  finished: 'bg-gray-800 text-white',
}

export default function StaffHome() {
  const { profile, isOwner, isPresident } = useAuth()
  const canDelete = isOwner || isPresident
  const nav = useNavigate()
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    const { data } = await supabase.from('events').select('*').order('event_date', { ascending: false })
    setEvents((data ?? []) as EventRow[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function setStatus(e: EventRow, status: string) {
    await supabase.from('events').update({ status }).eq('id', e.id)
    await load()
  }

  async function duplicate(e: EventRow) {
    setBusy(true)
    const payload: Record<string, unknown> = {
      title: `${e.title}（コピー）`,
      event_date: e.event_date,
      start_time: e.start_time,
      place: e.place,
      description: e.description,
      target: e.target,
      attendance_enabled: e.attendance_enabled,
      fee_type: e.fee_type,
      fee_config: e.fee_config,
      belongings: e.belongings,
      rain_info: e.rain_info,
      notes: e.notes,
      photos_enabled: e.photos_enabled,
      survey_enabled: e.survey_enabled,
      is_annual: e.is_annual,
      status: 'draft',
      created_by: profile?.id ?? null,
    }
    if (e.end_time) payload.end_time = e.end_time
    const { data, error } = await supabase.from('events').insert(payload).select('id').single()
    setBusy(false)
    if (!error && data) nav(`/staff/events/${(data as { id: string }).id}/edit`)
  }

  async function removeEvent(e: EventRow) {
    if (!canDelete) {
      setErr('イベント削除は会長・オーナーのみ可能です。')
      return
    }
    setDeletingId(e.id)
    setErr('')
    try {
      const [{ data: photos }, { data: receipts }] = await Promise.all([
        supabase.from('photos').select('storage_path,thumb_path').eq('event_id', e.id),
        supabase.from('receipts').select('image_path').eq('event_id', e.id),
      ])
      const mediaPaths = [e.image_path, e.flyer_path].filter(Boolean) as string[]
      if (mediaPaths.length > 0) await supabase.storage.from('event-media').remove([...new Set(mediaPaths)])
      const photoPaths = ((photos ?? []) as { storage_path: string; thumb_path: string }[]).flatMap((p) => [p.storage_path, p.thumb_path])
      if (photoPaths.length > 0) await supabase.storage.from('event-photos').remove(photoPaths)
      const receiptPaths = ((receipts ?? []) as { image_path: string | null }[]).map((r) => r.image_path).filter(Boolean) as string[]
      if (receiptPaths.length > 0) await supabase.storage.from('receipts').remove(receiptPaths)

      const { data, error } = await supabase.from('events').delete().eq('id', e.id).select('id').maybeSingle()
      if (error || !data) throw error ?? new Error('イベントが見つからないか、削除権限がありません。')
      setConfirmDeleteId(null)
      await load()
    } catch (error) {
      const message = error instanceof Error ? error.message : '削除に失敗しました。'
      setErr(message.includes('permission') || message.includes('forbidden') ? 'イベント削除は会長・オーナーのみ可能です。' : `削除に失敗しました: ${message}`)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <PageTitle>イベント管理</PageTitle>
        <Link to="/staff" className="text-sm text-gray-500">← ダッシュボード</Link>
      </div>

      <Link to="/staff/events/new"><Button variant="secondary">＋ イベントを作成</Button></Link>
      <ErrorText>{err}</ErrorText>

      {loading ? <Spinner /> : events.length === 0 ? (
        <EmptyState>まだイベントがありません。「＋ イベントを作成」から追加してください。</EmptyState>
      ) : (
        <div className="space-y-3">
          {events.map((e) => (
            <Card key={e.id}>
              <div className="mb-2 flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_CLS[e.status]}`}>{STATUS_LABEL[e.status]}</span>
                <span className="text-sm font-bold text-brand-red">{formatDateJP(e.event_date)}</span>
              </div>
              <h3 className="mb-3 text-lg font-extrabold">{e.title}</h3>
              <div className="flex flex-wrap gap-2">
                <Link to={`/staff/events/${e.id}`} className="rounded-xl bg-brand-red px-4 py-2 text-sm font-bold text-white">管理</Link>
                <Link to={`/staff/events/${e.id}/edit`} className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-bold">編集</Link>
                <button onClick={() => duplicate(e)} disabled={busy} className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-bold">複製</button>
                <Link to={`/events/${e.id}`} className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-bold">プレビュー</Link>
                {e.status !== 'published' && (
                  <button onClick={() => setStatus(e, 'published')} className="rounded-xl bg-brand-yellow px-4 py-2 text-sm font-bold text-black">公開</button>
                )}
                {e.status === 'published' && (
                  <button onClick={() => setStatus(e, 'draft')} className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-bold">非公開に戻す</button>
                )}
                {e.status !== 'finished' && (
                  <button onClick={() => setStatus(e, 'finished')} className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-bold">終了</button>
                )}
                {canDelete && (
                  confirmDeleteId === e.id ? (
                    <>
                      <button onClick={() => removeEvent(e)} disabled={deletingId === e.id} className="rounded-xl bg-brand-red px-4 py-2 text-sm font-bold text-white">
                        {deletingId === e.id ? '削除中…' : '本当に削除'}
                      </button>
                      <button onClick={() => setConfirmDeleteId(null)} disabled={deletingId === e.id} className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-bold">やめる</button>
                    </>
                  ) : (
                    <button onClick={() => setConfirmDeleteId(e.id)} className="rounded-xl border border-brand-red bg-white px-4 py-2 text-sm font-bold text-brand-red">削除</button>
                  )
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
      {!canDelete && <p className="text-xs text-gray-400">※ イベント削除は会長・オーナーのみ可能です。</p>}
    </div>
  )
}
