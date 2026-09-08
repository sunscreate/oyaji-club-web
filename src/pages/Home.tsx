import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatDateJP } from '../lib/format'
import { Button, Card, Spinner } from '../components/ui'
import type { EventRow } from '../types'

export default function Home() {
  const [next, setNext] = useState<EventRow | null>(null)
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
      setNext(((data ?? [])[0] as EventRow) ?? null)
      setLoading(false)
    })()
  }, [])

  return (
    <div className="space-y-4">
      <section>
        <h2 className="mb-2 text-sm font-bold text-gray-500">次のイベント</h2>
        {loading ? (
          <Spinner />
        ) : next ? (
          <Card>
            <p className="text-lg font-bold text-brand-red">{formatDateJP(next.event_date)}</p>
            <h3 className="mb-1 text-2xl font-extrabold">{next.title}</h3>
            {next.place && <p className="mb-4 text-gray-600">📍 {next.place}</p>}
            <div className="grid grid-cols-2 gap-3">
              <Link to={`/events/${next.id}`}><Button variant="ghost">詳しく見る</Button></Link>
              <Link to={`/events/${next.id}#join`}><Button variant="primary">参加する</Button></Link>
            </div>
          </Card>
        ) : (
          <Card><p className="text-gray-500">予定されているイベントはまだありません。</p></Card>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3">
        <Tile to="/annual" icon="📅" label="年間予定" />
        <Tile to="/events" icon="🎪" label="イベント" />
        <Tile to="/photos" icon="📷" label="写真" />
        <Tile to="/feedback" icon="✉️" label="ご意見・ご質問" />
        <Tile to="/about" icon="🦁" label="おやじ倶楽部について" />
      </section>
    </div>
  )
}

function Tile({ to, icon, label }: { to: string; icon: string; label: string }) {
  return (
    <Link to={to} className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-white p-6 text-center font-bold shadow-sm active:scale-[0.98]">
      <span className="text-3xl">{icon}</span>
      <span>{label}</span>
    </Link>
  )
}
