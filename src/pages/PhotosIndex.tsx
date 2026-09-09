import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { fiscalYear, formatDateJP } from '../lib/format'
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

  const byYear = new Map<number, { event: EventRow; count: number }[]>()
  for (const row of rows) {
    const year = fiscalYear(row.event.event_date)
    byYear.set(year, [...(byYear.get(year) ?? []), row])
  }
  const years = [...byYear.keys()].sort((a, b) => b - a)

  return (
    <div>
      <PageTitle>写真</PageTitle>
      {rows.length === 0 ? (
        <EmptyState>まだ写真が投稿されたイベントはありません。</EmptyState>
      ) : (
        <div className="space-y-5">
          {years.map((year) => (
            <section key={year}>
              <h2 className="mb-2 text-sm font-bold text-gray-500">{year}年度のイベント写真</h2>
              <div className="space-y-3">
                {byYear.get(year)!.map(({ event, count }) => (
                  <Link key={event.id} to={`/events/${event.id}/photos`}>
                    <Card className="flex items-center gap-3">
                      <span className="text-2xl">📷</span>
                      <div className="flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-extrabold text-brand-red">{year}年度イベント</span>
                          <span className="text-sm font-bold text-brand-red">{formatDateJP(event.event_date)}</span>
                        </div>
                        <p className="font-extrabold">{event.title}</p>
                      </div>
                      <span className="text-sm font-bold text-gray-500">{count}枚</span>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
