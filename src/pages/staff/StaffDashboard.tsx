import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatDateJP } from '../../lib/format'
import { Card, PageTitle, Spinner } from '../../components/ui'
import type { EventRow } from '../../types'

export default function StaffDashboard() {
  const [next, setNext] = useState<EventRow | null>(null)
  const [stats, setStats] = useState<{ hh: number; people: number }>({ hh: 0, people: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      const today = new Date().toISOString().slice(0, 10)
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'published')
        .gte('event_date', today)
        .order('event_date', { ascending: true })
        .limit(1)
      const ev = ((data ?? [])[0] as EventRow) ?? null
      setNext(ev)
      if (ev) {
        const { data: ps } = await supabase.from('participations').select('id').eq('event_id', ev.id)
        const pIds = (ps ?? []).map((p) => (p as { id: string }).id)
        let people = 0
        if (pIds.length) {
          const { count } = await supabase
            .from('participation_members')
            .select('id', { count: 'exact', head: true })
            .in('participation_id', pIds)
          people = count ?? 0
        }
        setStats({ hh: pIds.length, people })
      }
      setLoading(false)
    })()
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <PageTitle>お世話係</PageTitle>
        <Link to="/" className="text-sm text-gray-500">一般画面へ →</Link>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-bold text-gray-500">次回イベント</h2>
        {loading ? <Spinner /> : next ? (
          <Card>
            <p className="text-sm font-bold text-brand-red">{formatDateJP(next.event_date)}{next.start_time ? ` ${next.start_time}` : ''}</p>
            <h3 className="mb-3 text-xl font-extrabold">{next.title}</h3>
            <div className="mb-3 rounded-xl bg-gray-50 p-3">
              <p className="text-sm text-gray-500">参加</p>
              <p className="text-2xl font-extrabold">{stats.hh}<span className="ml-1 text-base text-gray-500">世帯</span> / {stats.people}<span className="ml-1 text-base text-gray-500">人</span></p>
            </div>
            <Link to={`/staff/events/${next.id}/participants`} className="block"><div className="rounded-xl bg-brand-red px-4 py-3 text-center font-bold text-white">参加状況を見る</div></Link>
          </Card>
        ) : (
          <Card><p className="text-gray-500">公開中の次回イベントはありません。</p></Card>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Tile to="/staff/events" icon="🎪" label="イベント管理" />
        <Tile to="/staff/events/new" icon="➕" label="イベント作成" />
        <Tile to="/staff/prep" icon="🛒" label="準備・買い物" sub="準備中" />
        <Tile to="/staff/accounting" icon="💰" label="会計" sub="準備中" />
      </section>
    </div>
  )
}

function Tile({ to, icon, label, sub }: { to: string; icon: string; label: string; sub?: string }) {
  return (
    <Link to={to} className="flex flex-col items-center justify-center gap-1 rounded-2xl bg-white p-5 text-center font-bold shadow-sm active:scale-[0.98]">
      <span className="text-2xl">{icon}</span>
      <span className="text-sm">{label}</span>
      {sub && <span className="text-xs font-normal text-gray-400">{sub}</span>}
    </Link>
  )
}
