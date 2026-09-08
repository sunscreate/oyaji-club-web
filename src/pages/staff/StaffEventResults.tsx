import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { loadRoster, type RosterEntry } from '../../lib/roster'
import { yen } from '../../lib/fee'
import { formatDateJP } from '../../lib/format'
import { Card, PageTitle, Spinner } from '../../components/ui'
import type { EventRow } from '../../types'

function normalizeTitle(t: string): string {
  return t.replace(/（コピー）/g, '').replace(/\(コピー\)/g, '').trim()
}

export default function StaffEventResults() {
  const { id } = useParams<{ id: string }>()
  const [event, setEvent] = useState<EventRow | null>(null)
  const [entries, setEntries] = useState<RosterEntry[]>([])
  const [expense, setExpense] = useState(0)
  const [prev, setPrev] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      if (!id) return
      const { event, entries } = await loadRoster(id)
      setEvent(event)
      setEntries(entries)
      const { data: rc } = await supabase.from('receipts').select('amount').eq('event_id', id)
      setExpense(((rc ?? []) as { amount: number }[]).reduce((s, r) => s + (r.amount || 0), 0))
      if (event) {
        const { data: fin } = await supabase.from('events').select('*').eq('status', 'finished')
        const norm = normalizeTitle(event.title)
        setPrev(((fin ?? []) as EventRow[]).filter((e) => e.id !== id && normalizeTitle(e.title) === norm))
      }
      setLoading(false)
    })()
  }, [id])

  if (loading) return <Spinner />
  if (!event) return <Card><p>イベントが見つかりません。</p></Card>

  const households = entries.filter((e) => e.kind === 'household').length
  const guests = entries.filter((e) => e.kind === 'guest').length
  const people = entries.reduce((s, e) => s + e.adults + e.children, 0)
  const income = entries.filter((e) => e.record?.paid).reduce((s, e) => s + (e.record?.amount_actual ?? e.normal), 0)
  const balance = income - expense

  return (
    <div className="space-y-4">
      <Link to={`/staff/events/${id}`} className="text-sm text-gray-500">← イベント管理</Link>
      <div>
        <p className="text-sm font-bold text-brand-red">{formatDateJP(event.event_date)}</p>
        <PageTitle>{event.title} 実績</PageTitle>
      </div>

      <Card>
        <div className="grid grid-cols-2 gap-2 text-center">
          <M label="参加世帯" value={`${households}世帯`} />
          <M label="参加人数" value={`${people}人`} />
          <M label="参加費収入" value={yen(income)} />
          <M label="支出" value={yen(expense)} />
        </div>
        <div className={`mt-3 rounded-xl p-3 text-center ${balance < 0 ? 'bg-red-50' : 'bg-green-50'}`}>
          <p className="text-sm text-gray-500">収支</p>
          <p className={`text-2xl font-extrabold ${balance < 0 ? 'text-brand-red' : 'text-green-700'}`}>{balance >= 0 ? '+' : ''}{yen(balance)}</p>
        </div>
        {guests > 0 && <p className="mt-2 text-center text-sm text-gray-500">（うちゲスト {guests}件）</p>}
      </Card>

      <Card>
        <p className="text-xs text-gray-500">収入＝当日会計の受取合計、支出＝立替(レシート)の合計から算出しています。当日会計・立替精算の入力が実績に反映されます。</p>
      </Card>

      <section>
        <h2 className="mb-2 text-sm font-bold text-gray-500">前年までの同名イベント実績</h2>
        {prev.length === 0 ? (
          <Card><p className="text-gray-500">同名の過去イベントはありません。</p></Card>
        ) : (
          <div className="space-y-2">
            {prev.map((e) => (
              <Link key={e.id} to={`/staff/events/${e.id}/results`}>
                <Card className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-bold text-brand-red">{formatDateJP(e.event_date)}</p>
                    <p className="font-bold">{e.title}</p>
                  </div>
                  <span className="text-gray-400">実績を見る ›</span>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function M({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 py-3">
      <p className="text-lg font-extrabold">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}
