import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDateJP, formatTimeRange, isPast } from '../lib/format'
import { Card, EmptyState, PageTitle, Spinner } from '../components/ui'
import type { EventRow } from '../types'

export default function Events() {
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

  const upcoming = events.filter((e) => !isPast(e.event_date))
  const past = events.filter((e) => isPast(e.event_date)).reverse()

  return (
    <div>
      <PageTitle>イベント</PageTitle>
      {upcoming.length === 0 && past.length === 0 ? (
        <EmptyState>公開中のイベントはまだありません。</EmptyState>
      ) : (
        <div className="space-y-4">
          {upcoming.length > 0 && (
            <Section title="これからのイベント">
              {upcoming.map((e) => <Row key={e.id} e={e} />)}
            </Section>
          )}
          {past.length > 0 && (
            <Section title="過去のイベント">
              {past.map((e) => <Row key={e.id} e={e} past />)}
            </Section>
          )}
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-bold text-gray-500">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function Row({ e, past }: { e: EventRow; past?: boolean }) {
  return (
    <Link to={`/events/${e.id}`}>
      <Card className={past ? 'opacity-80' : ''}>
        <p className="text-sm font-bold text-brand-red">{formatDateJP(e.event_date)}{formatTimeRange(e.start_time, e.end_time) ? ` ${formatTimeRange(e.start_time, e.end_time)}` : ''}</p>
        <h3 className="text-xl font-extrabold">{e.title}</h3>
        {e.place && <p className="text-gray-600">📍 {e.place}</p>}
      </Card>
    </Link>
  )
}
