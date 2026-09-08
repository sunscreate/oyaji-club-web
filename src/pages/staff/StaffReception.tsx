import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { loadRoster, upsertDayRecord, type RosterEntry } from '../../lib/roster'
import { computeNormal, type FeeConfig } from '../../lib/fee'
import { Button, Card, Field, Input, PageTitle, Spinner } from '../../components/ui'
import type { EventRow } from '../../types'

export default function StaffReception() {
  const { id } = useParams<{ id: string }>()
  const [event, setEvent] = useState<EventRow | null>(null)
  const [entries, setEntries] = useState<RosterEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [gName, setGName] = useState('')
  const [gAdults, setGAdults] = useState('1')
  const [gChildren, setGChildren] = useState('0')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    const { event, entries } = await loadRoster(id)
    setEvent(event)
    setEntries(entries)
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  async function toggle(entry: RosterEntry) {
    const now = entry.record?.received ? null : new Date().toISOString()
    await upsertDayRecord(id!, entry, { received: !entry.record?.received, received_at: now })
    await load()
  }

  async function addGuest(e: React.FormEvent) {
    e.preventDefault()
    if (!gName.trim()) return
    setBusy(true)
    const a = Number(gAdults) || 0
    const c = Number(gChildren) || 0
    const { data, error } = await supabase.from('guests').insert({ event_id: id, name: gName.trim(), adults: a, children: c }).select('id').single()
    if (!error && data) {
      const cfg = (event?.fee_config ?? {}) as FeeConfig
      await supabase.from('day_records').insert({
        event_id: id, guest_id: (data as { id: string }).id, received: true, received_at: new Date().toISOString(),
        amount_normal: computeNormal(event?.fee_type ?? 'household', cfg, a, c),
      })
    }
    setGName(''); setGAdults('1'); setGChildren('0'); setAdding(false); setBusy(false)
    await load()
  }

  if (loading) return <Spinner />

  const receivedCount = entries.filter((e) => e.record?.received).length

  return (
    <div className="space-y-4">
      <Link to={`/staff/events/${id}`} className="text-sm text-gray-500">← イベント管理</Link>
      <PageTitle>当日受付</PageTitle>

      <Card>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-gray-50 py-2"><p className="text-2xl font-extrabold">{entries.length}</p><p className="text-xs text-gray-500">参加登録</p></div>
          <div className="rounded-xl bg-gray-50 py-2"><p className="text-2xl font-extrabold text-green-600">{receivedCount}</p><p className="text-xs text-gray-500">受付済</p></div>
          <div className="rounded-xl bg-gray-50 py-2"><p className="text-2xl font-extrabold text-brand-red">{entries.length - receivedCount}</p><p className="text-xs text-gray-500">未受付</p></div>
        </div>
      </Card>

      {adding ? (
        <Card>
          <form onSubmit={addGuest} className="space-y-3">
            <p className="text-sm font-bold text-gray-500">当日参加（ゲスト）を追加</p>
            <Field label="お名前"><Input value={gName} onChange={(e) => setGName(e.target.value)} required /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="大人"><Input type="number" inputMode="numeric" value={gAdults} onChange={(e) => setGAdults(e.target.value)} /></Field>
              <Field label="子ども"><Input type="number" inputMode="numeric" value={gChildren} onChange={(e) => setGChildren(e.target.value)} /></Field>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={busy}>追加</Button>
              <Button type="button" variant="ghost" onClick={() => setAdding(false)}>キャンセル</Button>
            </div>
          </form>
        </Card>
      ) : (
        <Button variant="secondary" onClick={() => setAdding(true)}>＋ 当日参加（ゲスト）</Button>
      )}

      <div className="space-y-2">
        {entries.map((e) => {
          const done = !!e.record?.received
          return (
            <button key={`${e.kind}:${e.refId}`} onClick={() => toggle(e)} className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 text-left ${done ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'}`}>
              <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${done ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'}`}>{done ? '✓' : ''}</span>
              <div className="flex-1">
                <p className="font-bold">{e.name}</p>
                <p className="text-sm text-gray-500">大人{e.adults} 子ども{e.children}</p>
              </div>
              <span className={`text-sm font-bold ${done ? 'text-green-600' : 'text-gray-400'}`}>{done ? '受付済' : '受付する'}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
