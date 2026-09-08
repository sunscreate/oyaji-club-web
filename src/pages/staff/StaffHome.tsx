import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatDateJP } from '../../lib/format'
import { Button, Card, EmptyState, PageTitle, Spinner } from '../../components/ui'
import type { EventRow } from '../../types'

const STATUS_LABEL: Record<string, string> = { draft: '下書き', published: '公開中', finished: '終了' }
const STATUS_CLS: Record<string, string> = {
  draft: 'bg-gray-200 text-gray-700',
  published: 'bg-brand-red text-white',
  finished: 'bg-gray-800 text-white',
}

export default function StaffHome() {
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <PageTitle>お世話係</PageTitle>
        <Link to="/" className="text-sm text-gray-500">一般画面へ →</Link>
      </div>

      <Link to="/staff/events/new"><Button variant="secondary">＋ イベントを作成</Button></Link>

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
                <Link to={`/staff/events/${e.id}/edit`} className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-bold">編集</Link>
                <Link to={`/events/${e.id}`} className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-bold">プレビュー</Link>
                {e.status !== 'published' && (
                  <button onClick={() => setStatus(e, 'published')} className="rounded-xl bg-brand-red px-4 py-2 text-sm font-bold text-white">公開する</button>
                )}
                {e.status === 'published' && (
                  <button onClick={() => setStatus(e, 'draft')} className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-bold">非公開に戻す</button>
                )}
                {e.status !== 'finished' && (
                  <button onClick={() => setStatus(e, 'finished')} className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-bold">終了にする</button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <h2 className="mb-1 text-sm font-bold text-gray-500">今後のフェーズで追加予定</h2>
        <p className="text-sm text-gray-500">写真管理 / 準備・買い物 / 会計・立替精算 / 当日受付・当日会計 / アンケート作成・集計 / 過去イベント実績</p>
      </Card>
    </div>
  )
}
