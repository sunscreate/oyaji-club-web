import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { fiscalYear, formatDateJP, isPast } from '../lib/format'
import { Card, EmptyState, PageTitle, Spinner } from '../components/ui'
import type { EventRow } from '../types'

export default function PastEvents() {
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase
        .from('events')
        .select('*')
        .in('status', ['published', 'finished'])
        .order('event_date', { ascending: false })
      const past = ((data ?? []) as EventRow[]).filter((e) => e.status === 'finished' || isPast(e.event_date))
      setEvents(past)
      setLoading(false)
    })()
  }, [])

  if (loading) return <Spinner />

  const byYear = new Map<number, EventRow[]>()
  for (const e of events) {
    const y = fiscalYear(e.event_date)
    if (!byYear.has(y)) byYear.set(y, [])
    byYear.get(y)!.push(e)
  }
  const years = [...byYear.keys()].sort((a, b) => b - a)

  return (
    <div>
      <PageTitle>過去イベント</PageTitle>
      {years.length === 0 ? (
        <EmptyState>終了したイベントはまだありません。</EmptyState>
      ) : (
        <div className="space-y-5">
          {years.map((y) => (
            <section key={y}>
              <h2 className="mb-2 text-sm font-bold text-gray-500">{y}年度</h2>
              <div className="space-y-2">
                {byYear.get(y)!.map((e) => (
                  <Link key={e.id} to={`/events/${e.id}`}>
                    <Card>
                      <p className="text-sm font-bold text-brand-red">{formatDateJP(e.event_date)}</p>
                      <p className="font-extrabold">{e.title}</p>
                      <div className="mt-1 flex gap-3 text-sm text-gray-500">
                        {e.photos_enabled && <span>📷 写真</span>}
                        {e.survey_enabled && <span>📝 アンケート</span>}
                      </div>
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
