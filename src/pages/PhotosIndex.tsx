import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDateJP } from '../lib/format'
import { Card, EmptyState, PageTitle, Spinner } from '../components/ui'
import type { EventRow } from '../types'

export default function PhotosIndex() {
  const [rows, setRows] = useState<{ event: EventRow; count: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const { data: ph } = await supabase.from('photos').select('event_id')
      const counts = new Map<string, number>()
      ;((ph ?? []) as { event_id: string }[]).forEach((p) => counts.set(p.event_id, (counts.get(p.event_id) ?? 0) + 1))
      const ids = [...counts.keys()]
      if (ids.length === 0) { setLoading(false); return }
      const { data: evs } = await supabase.from('events').select('*').in('id', ids)
      const list = ((evs ?? []) as EventRow[])
        .map((e) => ({ event: e, count: counts.get(e.id) ?? 0 }))
        .sort((a, b) => (a.event.event_date < b.event.event_date ? 1 : -1))
      setRows(list)
      setLoading(false)
    })()
  }, [])

  if (loading) return <Spinner />

  return (
    <div>
      <PageTitle>写真</PageTitle>
      {rows.length === 0 ? (
        <EmptyState>まだ写真が投稿されたイベントはありません。</EmptyState>
      ) : (
        <div className="space-y-3">
          {rows.map(({ event, count }) => (
            <Link key={event.id} to={`/events/${event.id}/photos`}>
              <Card className="flex items-center gap-3">
                <span className="text-2xl">📷</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-brand-red">{formatDateJP(event.event_date)}</p>
                  <p className="font-extrabold">{event.title}</p>
                </div>
                <span className="text-sm font-bold text-gray-500">{count}枚</span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
