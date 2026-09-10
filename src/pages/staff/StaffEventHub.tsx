import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatDateJP } from '../../lib/format'
import { Card, PageTitle, Spinner } from '../../components/ui'
import type { EventRow } from '../../types'

export default function StaffEventHub() {
  const { id } = useParams<{ id: string }>()
  const [event, setEvent] = useState<EventRow | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.from('events').select('*').eq('id', id).maybeSingle()
      setEvent((data as EventRow) ?? null)
      setLoading(false)
    })()
  }, [id])

  if (loading) return <Spinner />
  if (!event) return <Card><p>イベントが見つかりません。</p></Card>

  const hasFee = event.fee_type !== 'none'
  const tiles = [
    { to: `/staff/events/${id}/participants`, icon: '👨‍👩‍👧', label: '参加状況' },
    { to: `/staff/events/${id}/prep`, icon: '🛒', label: '準備・買い物' },
    { to: `/staff/events/${id}/receipts`, icon: '🧾', label: '立替精算' },
    ...(hasFee ? [
      { to: `/staff/events/${id}/reception`, icon: '✅', label: '当日受付' },
      { to: `/staff/events/${id}/accounting`, icon: '💰', label: '当日会計' },
    ] : []),
    { to: `/staff/events/${id}/survey`, icon: '📝', label: 'アンケート' },
    { to: `/staff/events/${id}/results`, icon: '📊', label: hasFee ? '実績・収支' : '実績' },
    { to: `/staff/events/${id}/edit`, icon: '✏️', label: 'イベント編集' },
  ]

  return (
    <div className="space-y-4">
      <Link to="/staff/events" className="text-sm text-gray-500">← イベント管理</Link>
      <div>
        <p className="text-sm font-bold text-brand-red">{formatDateJP(event.event_date)}</p>
        <PageTitle>{event.title}</PageTitle>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {tiles.map((t) => (
          <Link key={t.to} to={t.to} className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-white p-6 text-center font-bold shadow-sm active:scale-[0.98]">
            <span className="text-3xl">{t.icon}</span>
            <span className="text-sm">{t.label}</span>
          </Link>
        ))}
      </div>
      <Link to={`/events/${id}`} className="block text-center text-sm text-gray-500">一般画面でプレビュー →</Link>
    </div>
  )
}
