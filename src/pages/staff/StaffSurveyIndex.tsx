import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatDateJP } from '../../lib/format'
import { Card, EmptyState, PageTitle, Spinner } from '../../components/ui'

interface Ev { id: string; title: string; event_date: string }

export default function StaffSurveyIndex() {
  const [events, setEvents] = useState<Ev[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const { data: evs } = await supabase
        .from('events')
        .select('id,title,event_date')
        .eq('survey_enabled', true)
        .order('event_date', { ascending: false })
      setEvents((evs ?? []) as Ev[])
      const { data: rs } = await supabase.from('survey_responses').select('event_id,profile_id')
      const map: Record<string, Set<string>> = {}
      ;((rs ?? []) as { event_id: string; profile_id: string }[]).forEach((r) => {
        ;(map[r.event_id] ??= new Set()).add(r.profile_id)
      })
      const c: Record<string, number> = {}
      Object.entries(map).forEach(([k, v]) => (c[k] = v.size))
      setCounts(c)
      setLoading(false)
    })()
  }, [])

  if (loading) return <Spinner />

  return (
    <div className="space-y-4">
      <Link to="/staff" className="text-sm text-gray-500">← ダッシュボード</Link>
      <PageTitle>アンケート結果</PageTitle>
      {events.length === 0 ? (
        <EmptyState>アンケートを設定したイベントはまだありません。</EmptyState>
      ) : (
        <div className="space-y-2">
          {events.map((e) => (
            <Link key={e.id} to={`/staff/events/${e.id}/survey-results`}>
              <Card className="flex items-center gap-3 active:scale-[0.99]">
                <div className="flex-1">
                  <p className="text-sm font-bold text-brand-red">{formatDateJP(e.event_date)}</p>
                  <p className="font-extrabold">{e.title}</p>
                </div>
                <span className="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-sm font-bold text-gray-600">回答 {counts[e.id] ?? 0}</span>
                <span className="text-gray-400">›</span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
