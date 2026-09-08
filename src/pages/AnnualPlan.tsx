import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { fiscalYear, formatDateJP } from '../lib/format'
import { Card, EmptyState, PageTitle, Spinner } from '../components/ui'
import type { EventRow } from '../types'

export default function AnnualPlan() {
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase
        .from('events')
        .select('*')
        .in('status', ['published', 'finished'])
        .order('event_date', { ascending: true })
      setEvents((data ?? []) as EventRow[])
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
      <PageTitle>年間予定</PageTitle>
      {years.length === 0 ? (
        <EmptyState>予定はまだ登録されていません。</EmptyState>
      ) : (
        <div className="space-y-5">
          {years.map((y) => (
            <section key={y}>
              <h2 className="mb-2 text-sm font-bold text-gray-500">{y}年度</h2>
              <Card className="divide-y divide-gray-100 p-0">
                {byYear.get(y)!.map((e) => (
                  <Link key={e.id} to={`/events/${e.id}`} className="flex items-center gap-3 px-4 py-3">
                    <span className="w-24 shrink-0 text-sm font-bold text-brand-red">{formatDateJP(e.event_date)}</span>
                    <span className="font-bold">{e.title}</span>
                  </Link>
                ))}
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
